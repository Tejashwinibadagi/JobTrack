package jobtracker.controller;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final Path uploadDirectory =
            Paths.get(System.getProperty("user.home"), "JobTrackResumes");

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadResume(
            @RequestParam("file") MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Please select a resume file");
        }

        String originalName = file.getOriginalFilename();

        if (originalName == null || originalName.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid filename");
        }

        String lowerName = originalName.toLowerCase(Locale.ROOT);

        if (!(lowerName.endsWith(".pdf")
                || lowerName.endsWith(".doc")
                || lowerName.endsWith(".docx"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PDF, DOC, and DOCX files are allowed");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Resume must be 5 MB or smaller");
        }

        try {
            Files.createDirectories(uploadDirectory);

            String extension =
                    lowerName.substring(lowerName.lastIndexOf('.'));

            String savedName = UUID.randomUUID() + extension;

            Path destination = uploadDirectory
                    .resolve(savedName)
                    .normalize();

            if (!destination.startsWith(uploadDirectory.normalize())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Invalid filename");
            }

            Files.copy(file.getInputStream(), destination);

            String resumeText = extractText(destination, extension);
            System.out.println("Extracted Resume Text:");
            System.out.println(resumeText);
            List<String> skills = findSkills(resumeText);

            return Map.of(
                    "message", "Resume uploaded and analyzed successfully",
                    "fileName", originalName,
                    "savedAs", savedName,
                    "skills", skills,
                    "skillsFound", skills.size()
            );

        } catch (ResponseStatusException exception) {
            throw exception;

        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Could not read this resume. Please check the file and try again");
        }
    }

    private String extractText(Path filePath, String extension)
            throws IOException {

        if (extension.equals(".pdf")) {
            try (PDDocument document =
                         Loader.loadPDF(filePath.toFile())) {

                return new PDFTextStripper().getText(document);
            }
        }

        if (extension.equals(".docx")) {
            try (InputStream input = Files.newInputStream(filePath);
                 XWPFDocument document = new XWPFDocument(input);
                 XWPFWordExtractor extractor =
                         new XWPFWordExtractor(document)) {

                return extractor.getText();
            }
        }

        if (extension.equals(".doc")) {
            try (InputStream input = Files.newInputStream(filePath);
                 HWPFDocument document = new HWPFDocument(input);
                 WordExtractor extractor = new WordExtractor(document)) {

                return extractor.getText();
            }
        }

        throw new IOException("Unsupported resume format");
    }

    private List<String> findSkills(String resumeText) {

        String text = resumeText.toLowerCase(Locale.ROOT);

        String[] possibleSkills = {
                "java",
                "sql",
                "mysql",
                "oracle",
                "html",
                "css",
                "javascript",
                "spring boot",
                "spring",
                "rest api",
                "restful api",
                "hibernate",
                "jdbc",
                "git",
                "github",
                "linux",
                "python",
                "c++",
                "data structures",
                "object-oriented programming",
                "oops",
                "maven",
                "jpa",
                "react",
                "angular",
                "node.js"
        };

        List<String> skills = new ArrayList<>();

        for (String skill : possibleSkills) {
            if (containsSkill(text, skill)) {
                skills.add(skill);
            }
        }

        return skills;
    }

    private boolean containsSkill(String text, String skill) {

        String escapedSkill = java.util.regex.Pattern.quote(skill);

        return java.util.regex.Pattern.compile(
                        "(?<![a-z0-9+#.])"
                                + escapedSkill
                                + "(?![a-z0-9+#.])",
                        java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(text)
                .find();
    }
}