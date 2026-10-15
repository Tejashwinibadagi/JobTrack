package jobtracker.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import jobtracker.entity.JobApplication;

public interface JobApplicationRepository
        extends JpaRepository<JobApplication, Integer> {

}