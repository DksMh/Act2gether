package com.example.act2gether.service;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService{
    private final UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        System.out.println("=== CustomUserDetailsService 호출 ===");
        System.out.println("입력된 email: " + email);
        
        UserEntity user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + email));
        
        System.out.println("조회된 사용자 정보:");
        System.out.println("- userid: " + user.getUser_id());
        System.out.println("- email: " + user.getEmail());
        System.out.println("- username: " + user.getUsername());
        System.out.println("- user_role: " + user.getUser_role());
        
        // 사용자 역할을 동적으로 설정
        String role = user.getUser_role() != null ? user.getUser_role() : "USER";
        if (!role.startsWith("ROLE_")) {
            role = "ROLE_" + role;
        }
        
        System.out.println("설정된 권한: " + role);
        
        return new User(
            user.getUser_id(), 
            user.getPassword(),
            List.of(new SimpleGrantedAuthority(role))
        );
    }
}