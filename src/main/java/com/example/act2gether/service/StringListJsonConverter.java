package com.example.act2gether.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {
    private static final ObjectMapper om = new ObjectMapper();
    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try { return om.writeValueAsString(attribute); }
        catch (Exception e) { throw new IllegalStateException("pictures 직렬화 실패", e); }
    }
    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try { return om.readValue(dbData, new TypeReference<List<String>>(){}); }
        catch (Exception e) { throw new IllegalStateException("pictures 역직렬화 실패", e); }
    }
}