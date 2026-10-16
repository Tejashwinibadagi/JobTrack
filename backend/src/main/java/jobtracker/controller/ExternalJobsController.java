package jobtracker.controller;

import java.util.List;
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

    @GetMapping
    public Map<String, Object> getExternalJobs(
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
            return Map.of("jobs", List.of());
        }

        Object jobs = response.get("jobs");

        if (jobs instanceof List<?> jobList) {
            return Map.of("jobs", jobList);
        }

        return Map.of("jobs", List.of());
    }
}
