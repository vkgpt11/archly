package io.archly.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Set;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

class AiGenerationAccountingTest {
    final ObjectMapper mapper=new ObjectMapper();
    final AiProviderClient provider=mock(AiProviderClient.class);
    final UserLlmSettingsService settings=mock(UserLlmSettingsService.class);
    final AiUsageService usage=mock(AiUsageService.class);
    final AiRequestStore store=mock(AiRequestStore.class);
    final AiGenerationRateLimiter limiter=mock(AiGenerationRateLimiter.class);
    final AiPricing pricing=new AiPricing(mapper,"{\"model\":{\"input\":1,\"cachedInput\":0.1,\"output\":2}}","test-version");
    DiagramGenerationService service(Duration timeout) {
        when(settings.requireConfiguration("user")).thenReturn(new UserLlmSettingsService.Configuration("model","test-key"));
        when(store.begin(eq("user"),anyString(),anyString(),any())).thenReturn(new AiRequestStore.Claim("id","NEW",null,null,null));
        return new DiagramGenerationService(provider,mapper,settings,Set.of("model"),usage,pricing,store,limiter,timeout);
    }
    JsonNode response(String text) {
        var root=mapper.createObjectNode();
        root.putObject("usage").put("input_tokens",100).put("output_tokens",50);
        root.putArray("output").addObject().putArray("content").addObject().put("type","output_text").put("text",text);
        return root;
    }
    @Test void accountsForInitialAndRepairAndRecordsOnlyFinalSuccess() {
        var service=service(Duration.ofSeconds(2));
        JsonNode first=response("{broken"), repaired=response("{\"summary\":\"Fixed\",\"nodes\":[{\"key\":\"api\",\"kind\":\"service\",\"label\":\"API\"}],\"edges\":[]}");
        var calls=new java.util.concurrent.atomic.AtomicInteger();
        when(provider.request(any(),any(),anyString(),any(),any())).thenAnswer(invocation -> {
            JsonNode result=calls.getAndIncrement()==0?first:repaired;
            Consumer<JsonNode> account=invocation.getArgument(4);account.accept(result);return result;
        });
        var result=service.generate("user","Build API");
        assertThat(result.summary()).isEqualTo("Fixed");
        var captured=ArgumentCaptor.forClass(AiUsageAccumulator.class);
        verify(usage).record(eq("id"),eq("user"),eq("model"),captured.capture(),eq("SUCCESS"),eq("test-version"),anyLong());
        assertThat(captured.getValue().attempts).isEqualTo(2);
        assertThat(captured.getValue().repairAttempts).isEqualTo(1);
        assertThat(captured.getValue().cost).isEqualTo(400);
        verify(store).complete("user","id",result);
    }
    @Test void repairFailureRemainsAFailureAndDeadlinePreventsRepair() throws Exception {
        var service=service(Duration.ofMillis(50));
        when(provider.request(any(),any(),anyString(),any(),any())).thenAnswer(invocation -> {
            JsonNode result=response("{broken");Consumer<JsonNode> account=invocation.getArgument(4);account.accept(result);
            Thread.sleep(100);return result;
        });
        assertThatThrownBy(() -> service.generate("user","Build API")).isInstanceOf(ResponseStatusException.class).hasMessageContaining("deadline");
        verify(provider,times(1)).request(any(),any(),anyString(),any(),any());
        verify(usage).record(anyString(),eq("user"),eq("model"),any(),eq("DEADLINE"),eq("test-version"),anyLong());
        verify(store,never()).complete(anyString(),anyString(),any());
    }
    @Test void replayDoesNotCallProviderRateLimiterOrRecordCostAgain() {
        var service=service(Duration.ofSeconds(1));
        var result=new DiagramGenerationDtos.GenerateDiagramResponse(mapper.createObjectNode(),"Replayed");
        when(store.begin(eq("user"),anyString(),anyString(),any())).thenReturn(new AiRequestStore.Claim("id","COMPLETED",result,null,null));
        assertThat(service.generate("user","Build API")).isEqualTo(result);
        verifyNoInteractions(provider,usage,limiter);
    }
    @Test void connectionTestsAlsoRecordProviderUsage() {
        var service=service(Duration.ofSeconds(1));
        when(provider.request(any(),any(),anyString(),any(),any())).thenAnswer(invocation -> {
            JsonNode result=response("OK");Consumer<JsonNode> account=invocation.getArgument(4);account.accept(result);return result;
        });
        service.testConnection("user","model",null);
        var captured=ArgumentCaptor.forClass(AiUsageAccumulator.class);
        verify(usage).record(anyString(),eq("user"),eq("model"),captured.capture(),eq("SUCCESS"),eq("test-version"),anyLong());
        assertThat(captured.getValue().cost).isEqualTo(200);
    }
}
