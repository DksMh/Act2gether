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
        UserEntity user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + email));
// System.out.println("유저 찾음: " + user.getEmail());
// System.out.println("암호화된 비밀번호: " + user.getPassword());
        return new User( // org.springframework.security.core.userdetails.User
            user.getEmail(), // username
            user.getPassword(), // 암호화된 password
            List.of(new SimpleGrantedAuthority("ROLE_USER")) // 권한
        );
    }
}
