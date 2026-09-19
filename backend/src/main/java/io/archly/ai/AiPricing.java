package io.archly.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class AiPricing {
    record Rates(BigDecimal input, BigDecimal cachedInput, BigDecimal output) {
        long cost(long inputTokens, long cachedTokens, long outputTokens) {
            // USD per million tokens is numerically equal to micro-USD per token.
            return input.multiply(BigDecimal.valueOf(inputTokens - cachedTokens))
                .add(cachedInput.multiply(BigDecimal.valueOf(cachedTokens)))
                .add(output.multiply(BigDecimal.valueOf(outputTokens))).setScale(0, RoundingMode.CEILING).longValueExact();
        }
    }
    private final Map<String, Rates> models = new HashMap<>();
    final String version;
    AiPricing(ObjectMapper mapper, @Value("${archly.ai.pricing-json}") String json,
              @Value("${archly.ai.pricing-version}") String version) {
        this.version = version;
        try {
            var root = mapper.readTree(json);
            if (!root.isObject() || root.isEmpty() || version.isBlank()) throw new IllegalArgumentException();
            var fields = root.fields();
            while (fields.hasNext()) {
                var entry = fields.next(); var value = entry.getValue();
                for (String field : new String[] {"input", "cachedInput", "output"})
                    if (!value.path(field).isNumber() || value.path(field).decimalValue().signum() < 0) throw new IllegalArgumentException();
                var rates = new Rates(value.get("input").decimalValue(), value.get("cachedInput").decimalValue(), value.get("output").decimalValue());
                if (rates.cachedInput().compareTo(rates.input()) > 0) throw new IllegalArgumentException();
                models.put(entry.getKey(), rates);
            }
        } catch (Exception exception) { throw new IllegalArgumentException("Configure valid AI pricing and a pricing version."); }
    }
    Rates require(String model) {
        Rates rates = models.get(model);
        if (rates == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pricing is configured for this AI model. Ask an administrator to configure it.");
        return rates;
    }
}
