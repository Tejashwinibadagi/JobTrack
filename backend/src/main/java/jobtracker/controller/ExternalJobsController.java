package jobtracker.controller;

import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Arrays;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/jobs")
public class ExternalJobsController {

    private final RestClient restClient = RestClient.create();

    @GetMapping
    public Map<String, Object> getExternalJobs(
            @RequestParam(defaultValue = "java developer") String search) {

        try {
            Map<?, ?> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("remotive.com")
                            .path("/api/remote-jobs")
                            .queryParam("search", search)
                            .build())
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return Map.of("jobs", List.of());
            }

            Object jobsObject = response.get("jobs");

            if (!(jobsObject instanceof List<?> jobs)) {
                return Map.of("jobs", List.of());
            }

            String[] keywords = search.toLowerCase(Locale.ROOT)
                    .trim()
                    .split("\\s+");

            List<?> filteredJobs = jobs.stream()
                    .filter(job -> job instanceof Map<?, ?>)
                    .filter(job -> {
                        Map<?, ?> item = (Map<?, ?>) job;

                        String text = (
                                String.valueOf(item.get("title")) + " "
                                + String.valueOf(item.get("tags")) + " "
                                + String.valueOf(item.get("description")) + " "
                                + String.valueOf(item.get("company_name"))
                        ).toLowerCase(Locale.ROOT);

                        return Arrays.stream(keywords)
                                .filter(word -> !word.isBlank())
                                .anyMatch(text::contains);
                    })
                    .toList();

            return Map.of("jobs", filteredJobs);

        } catch (RestClientResponseException e) {
            System.err.println("Remotive API returned HTTP "
                    + e.getStatusCode() + ": " + e.getResponseBodyAsString());

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "External job provider returned an error",
                    e);

        } catch (Exception e) {
            System.err.println("Failed to fetch external jobs: " + e.getMessage());

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not fetch jobs from the external provider",
                    e);
        }
    }
}
