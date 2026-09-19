package io.archly.ai;

import com.fasterxml.jackson.databind.JsonNode;

final class AiUsageAccumulator {
    long input, cached, output, cost;
    int attempts, repairAttempts, unknownAttempts;
    private final AiPricing.Rates rates;
    AiUsageAccumulator(AiPricing.Rates rates) { this.rates = rates; }
    void add(JsonNode response, long inputByteBound, long outputBound, boolean repair) {
        attempts++;
        if (repair) repairAttempts++;
        JsonNode usage = response == null ? null : response.get("usage");
        if (usage == null || !usage.path("input_tokens").canConvertToLong() || !usage.path("output_tokens").canConvertToLong()
            || usage.path("input_tokens").asLong() < 0 || usage.path("output_tokens").asLong() < 0) {
            unknownAttempts++;
            // Conservative budget estimate; token totals remain reported-only.
            cost = Math.addExact(cost, rates.cost(inputByteBound, 0, outputBound)); return;
        }
        long in = usage.get("input_tokens").asLong(), out = usage.get("output_tokens").asLong();
        long cache = Math.max(0, Math.min(in, usage.path("input_tokens_details").path("cached_tokens").asLong()));
        input = Math.addExact(input, in); output = Math.addExact(output, out); cached = Math.addExact(cached, cache);
        cost = Math.addExact(cost, rates.cost(in, cache, out));
    }
}
