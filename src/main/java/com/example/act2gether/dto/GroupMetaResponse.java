package com.example.act2gether.dto;

public record GroupMetaResponse(
    String groupId,
        String title,
        String description,
        String departureRegion,  
        String flexible,     
        String startDate,
        String endDate,
        String schedule,
        String genderPolicy,
        long   members
      
) {

}
