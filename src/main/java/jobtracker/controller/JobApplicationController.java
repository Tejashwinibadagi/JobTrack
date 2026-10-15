
package jobtracker.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

import jobtracker.entity.Company;
import jobtracker.entity.JobApplication;
import jobtracker.repository.CompanyRepository;
import jobtracker.repository.JobApplicationRepository;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

    private final JobApplicationRepository jobApplicationRepository;
    private final CompanyRepository companyRepository;

    public JobApplicationController(
            JobApplicationRepository jobApplicationRepository,
            CompanyRepository companyRepository) {

        this.jobApplicationRepository = jobApplicationRepository;
        this.companyRepository = companyRepository;
    }

    // Get all job applications
    @GetMapping
    public List<JobApplication> getAllApplications() {
        return jobApplicationRepository.findAll();
    }

    // Add a new job application
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobApplication addApplication(
            @RequestBody JobApplication application) {

        if (application.getCompany() == null
                || application.getCompany().getCompanyId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Company ID is required");
        }

        Integer companyId = application.getCompany().getCompanyId();

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Company not found"));

        application.setCompany(company);

        return jobApplicationRepository.save(application);
    }

    // Update an application's status
    @PutMapping("/{id}/status")
    public JobApplication updateApplicationStatus(
            @PathVariable Integer id,
            @RequestBody String status) {

        JobApplication application = jobApplicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Application not found"));

        String cleanStatus = status.replace("\"", "").trim();

        if (!List.of("Saved", "Applied", "Interview", "Selected", "Rejected")
                .contains(cleanStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid application status");
        }

        application.setStatus(cleanStatus);

        return jobApplicationRepository.save(application);
    }
}

