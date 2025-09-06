package com.example.act2gether.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.example.act2gether.entity.PostImageEntity;
import com.example.act2gether.repository.PostImageRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AttachmentController {
    private final PostImageRepository postImageRepository;

    @GetMapping("/attachments/{id}")
    public ResponseEntity<byte[]> getImage(@PathVariable String id) {
        PostImageEntity a = postImageRepository.findById(id).orElseThrow();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, a.getContentType())
            .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(a.getSize()))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=\"" + URLEncoder.encode(a.getFilename(), StandardCharsets.UTF_8) + "\"")
            .body(a.getData());
    }
}
