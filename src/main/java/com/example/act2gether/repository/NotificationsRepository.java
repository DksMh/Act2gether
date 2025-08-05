package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.NotificationsEntity;

public interface NotificationsRepository extends JpaRepository<NotificationsEntity, String>{
    
}
