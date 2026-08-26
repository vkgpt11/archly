import { useEffect, type MutableRefObject } from 'react'
import type { Project } from '../types'
import {
  contentSignature, createDraft, readProjectSaveSignal, storeConflictBackup, storeDraft, type ProjectDraft,
} from '../projectPersistence'

type Props = {
  projectId: string
  tabId: string
  latestProject: MutableRefObject<Project>
  lastSavedSignature: MutableRefObject<string>
  conflictRef: MutableRefObject<unknown>
  getProject: (id: string) => Promise<Project>
  activateServerProject: (project: Project) => void
  onConflict: (local: ProjectDraft, server: Project) => void
}

export function useProjectCrossTabSync({
  projectId, tabId, latestProject, lastSavedSignature, conflictRef, getProject, activateServerProject, onConflict,
}: Props) {
  useEffect(() => {
    const receiveSaveFromAnotherTab = async (event: StorageEvent) => {
      const signal = readProjectSaveSignal(event, projectId, tabId)
      if (!signal || signal.revision <= latestProject.current.revision || conflictRef.current) return
      try {
        const server = await getProject(projectId)
        if (contentSignature(latestProject.current) === lastSavedSignature.current) {
          activateServerProject(server)
          return
        }
        const local = createDraft(latestProject.current, tabId)
        storeDraft(local)
        storeConflictBackup(local, server)
        onConflict(local, server)
      } catch {
        // The debounced save path remains responsible for reporting network failures.
      }
    }
    window.addEventListener('storage', receiveSaveFromAnotherTab)
    return () => window.removeEventListener('storage', receiveSaveFromAnotherTab)
  }, [activateServerProject, conflictRef, getProject, lastSavedSignature, latestProject, onConflict, projectId, tabId])
}
