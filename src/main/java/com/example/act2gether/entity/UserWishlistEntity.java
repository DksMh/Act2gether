package com.example.act2gether.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_wishlist")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWishlistEntity {
    @Id
    private String wishlist_id; //uuid
    private String user_id; 
    private String tour_id;
    private String wishlist_date;
}
