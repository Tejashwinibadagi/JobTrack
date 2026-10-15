package jobtracker.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/jobs")
public class ExternalJobsController {

    private final RestClient restClient = RestClient.create();

    // Fetch remote jobs from the Remotive API
    @GetMapping
    public Map<?, ?> getExternalJobs(
            @RequestParam(defaultValue = "java developer") String search) {

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
            return Map.of("jobs", java.util.List.of());
        }

        Object jobsObject = response.get("jobs");

        if (!(jobsObject instanceof java.util.List<?> jobs)) {
            return Map.of("jobs", java.util.List.of());
        }

        String keyword = search.toLowerCase().trim();

        java.util.List<?> filteredJobs = jobs.stream()
                .filter(job -> job instanceof Map<?, ?>)
                .filter(job -> {
                    Map<?, ?> item = (Map<?, ?>) job;

                    String title = String.valueOf(
                            item.get("title")
                    ).toLowerCase();

                    String tags = String.valueOf(
                            item.get("tags")
                    ).toLowerCase();

                    String description = String.valueOf(
                            item.get("description")
                    ).toLowerCase();

                    String company = String.valueOf(
                            item.get("company_name")
                    ).toLowerCase();

                    return title.contains(keyword)
                            || tags.contains(keyword)
                            || description.contains(keyword)
                            || company.contains(keyword);
                })
                .toList();

        return Map.of("jobs", filteredJobs);
    }
}