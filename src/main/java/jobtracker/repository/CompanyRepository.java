package jobtracker.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import jobtracker.entity.Company;

public interface CompanyRepository extends JpaRepository<Company, Integer> {

}