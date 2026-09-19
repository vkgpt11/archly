package io.archly.ai;
import java.time.*;import org.springframework.beans.factory.annotation.Value;import org.springframework.http.HttpStatus;import org.springframework.stereotype.Service;import org.springframework.web.server.ResponseStatusException;
@Service public class AiUsageService {
 public record Summary(long monthlyEstimatedCostMicros,long monthlyBudgetMicros,long requests,long inputTokens,long outputTokens,long failures,boolean alert,long cachedInputTokens,long unknownUsageAttempts,long providerAttempts,long repairAttempts){}
 private final org.springframework.jdbc.core.JdbcTemplate jdbc; private final AiRateLimitLockRepository locks;
 private final AiUsageRepository repo;private final long budget,userDailyBudget,userMonthlyBudget;private final double alertAt;
 AiUsageService(org.springframework.jdbc.core.JdbcTemplate jdbc,AiRateLimitLockRepository locks,AiUsageRepository repo,@Value("${archly.ai.monthly-budget-micros:100000000}")long budget,@Value("${archly.ai.user-daily-budget-micros:5000000}")long userDailyBudget,@Value("${archly.ai.user-monthly-budget-micros:25000000}")long userMonthlyBudget,@Value("${archly.ai.budget-alert-percent:80}")double alertAt){this.jdbc=jdbc;this.locks=locks;this.repo=repo;this.budget=budget;this.userDailyBudget=userDailyBudget;this.userMonthlyBudget=userMonthlyBudget;this.alertAt=alertAt;}
 void ensureBudget(String user){if(repo.costSince(monthStart())>=budget)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The administrator AI budget has been reached.");if(repo.userCostSince(user,dayStart())>=userDailyBudget)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Your daily AI cost limit has been reached.");if(repo.userCostSince(user,monthStart())>=userMonthlyBudget)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Your monthly AI cost limit has been reached.");}
 @org.springframework.transaction.annotation.Transactional
 void reserve(String id,String user,long cost){
  locks.acquire(0);
  long global=reserved(null,monthStart()),daily=reserved(user,dayStart()),monthly=reserved(user,monthStart());
  if(cost>budget-repo.costSince(monthStart())-global)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The administrator AI budget cannot cover this request.");
  if(cost>userDailyBudget-repo.userCostSince(user,dayStart())-daily || cost>userMonthlyBudget-repo.userCostSince(user,monthStart())-monthly)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Your AI cost limit cannot cover this request. Try a smaller request or wait for the budget reset.");
  jdbc.update("insert into ai_budget_reservations(request_id,user_subject,reserved_cost_micros,created_at) values (?,?,?,?)",id,user,cost,java.sql.Timestamp.from(Instant.now()));
 }
 private long reserved(String user,Instant since){return user==null?jdbc.queryForObject("select coalesce(sum(reserved_cost_micros),0) from ai_budget_reservations where created_at>=?",Long.class,java.sql.Timestamp.from(since)):jdbc.queryForObject("select coalesce(sum(reserved_cost_micros),0) from ai_budget_reservations where user_subject=? and created_at>=?",Long.class,user,java.sql.Timestamp.from(since));}
 @org.springframework.transaction.annotation.Transactional
 void record(String requestId,String user,String model,AiUsageAccumulator usage,String status,String pricingVersion,long durationMillis){
  locks.acquire(0);
  AiUsageEvent event=new AiUsageEvent(requestId,user,model,usage.input,usage.output,usage.cost,status);
  event.cachedInputTokens=usage.cached;event.providerAttempts=usage.attempts;event.repairAttempts=usage.repairAttempts;event.unknownUsageAttempts=usage.unknownAttempts;event.pricingVersion=pricingVersion;event.durationMillis=durationMillis;
  repo.saveAndFlush(event);
  jdbc.update("delete from ai_budget_reservations where request_id=? and user_subject=?",requestId,user);
 }
 @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 3600000)
 void cleanupReservations(){jdbc.update("delete from ai_budget_reservations where created_at<?",java.sql.Timestamp.from(Instant.now().minus(90,java.time.temporal.ChronoUnit.DAYS)));}
 public Summary summary(){long cost=repo.costSince(monthStart());Object[] row=repo.totalsSince(monthStart()).get(0);return new Summary(cost,budget,n(row[2]),n(row[0]),n(row[1]),n(row[3]),budget>0&&cost*100.0/budget>=alertAt,n(row[4]),n(row[5]),n(row[6]),n(row[7]));}private long n(Object value){return value==null?0:((Number)value).longValue();}private Instant dayStart(){return LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();}private Instant monthStart(){return YearMonth.now(ZoneOffset.UTC).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();}
}
