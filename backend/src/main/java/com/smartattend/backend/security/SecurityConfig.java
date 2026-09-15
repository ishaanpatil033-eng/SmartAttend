package com.smartattend.backend.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.frontend.origin:http://localhost:5173}")
    private String frontendOrigin;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Enable CORS with credentials enabled for React frontend
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Disable CSRF for REST APIs using session-based credentials with SameSite headers
            .csrf(AbstractHttpConfigurer::disable)
            // Prevent Clickjacking with X-Frame-Options: DENY
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
            )
            // Use server-side sessions for authenticated state with session fixation protection
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .sessionFixation(sessionFixation -> sessionFixation.changeSessionId())
            )
            // Custom JSON error handlers for unauthorized and access-denied responses
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Unauthorized: Please log in to access this resource.\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Forbidden: You do not have permission to access this resource.\"}");
                })
            )
            // Role-based endpoint authorization
            .authorizeHttpRequests(auth -> auth
                // Truly public endpoints
                .requestMatchers("/api/auth/login", "/api/health", "/error").permitAll()

                // Authenticated user session info and password management
                .requestMatchers("/api/auth/me", "/api/auth/logout", "/api/auth/change-password").authenticated()

                // User detail lookup by ID/username: authenticated users (matrix enforced authoritatively at controller)
                .requestMatchers(HttpMethod.GET, "/api/admin/users/*", "/api/admin/users/**", "/api/auth/users/*", "/api/auth/users/**").authenticated()

                // Admin user deletion: strictly Admin
                .requestMatchers(HttpMethod.DELETE, "/api/admin/users/**").hasRole("ADMIN")

                // Administrative password reset and faculty management: Admin and HOD only
                .requestMatchers("/api/auth/reset-password", "/api/auth/faculty", "/api/auth/faculty/**", "/api/admin/users/**").hasAnyRole("ADMIN", "HOD")

                // Dynamic QR Scanning: students and admin testing
                .requestMatchers("/api/attendance/qr/scan").hasAnyRole("STUDENT", "ADMIN")

                // Teacher attendance generation, manual recording, and course administration
                .requestMatchers("/api/attendance/qr/generate", "/api/attendance/manual").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")

                // Admin endpoints: institutional overview, user and course mutation
                .requestMatchers("/api/attendance/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/courses", "/api/courses/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/courses", "/api/courses/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/courses", "/api/courses/**").hasRole("ADMIN")

                // Class/Lecture creation: Faculty and Admin (HOD and Student forbidden)
                .requestMatchers(HttpMethod.POST, "/api/classes", "/api/classes/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/classes", "/api/classes/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")
                .requestMatchers(HttpMethod.DELETE, "/api/classes", "/api/classes/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")

                // Student management & directory
                .requestMatchers(HttpMethod.GET, "/api/students", "/api/students/**").hasAnyRole("ADMIN", "HOD", "TEACHER", "FACULTY", "STUDENT") // individual subpaths checked at controller
                .requestMatchers(HttpMethod.POST, "/api/students", "/api/students/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/students", "/api/students/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/students", "/api/students/**").hasRole("ADMIN")

                // HOD endpoints: department analytics and oversight
                .requestMatchers("/api/attendance/hod/**").hasAnyRole("HOD", "ADMIN")

                // Defaulter list and Excel export: Staff and Admin only
                .requestMatchers("/api/attendance/defaulters", "/api/attendance/defaulters/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")

                // Academic file upload: Faculty, Admin, HOD, and Student (for coursework submission)
                .requestMatchers(HttpMethod.POST, "/api/lms/upload").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD", "STUDENT")
                .requestMatchers(HttpMethod.POST, "/api/lms/resources", "/api/lms/resources/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")
                .requestMatchers(HttpMethod.DELETE, "/api/lms/resources", "/api/lms/resources/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")
                .requestMatchers(HttpMethod.POST, "/api/lms/assignments", "/api/lms/assignments/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD", "STUDENT")
                .requestMatchers(HttpMethod.DELETE, "/api/lms/assignments", "/api/lms/assignments/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD", "STUDENT")
                .requestMatchers(HttpMethod.POST, "/api/lms/announcements", "/api/lms/announcements/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")
                .requestMatchers(HttpMethod.DELETE, "/api/lms/announcements", "/api/lms/announcements/**").hasAnyRole("TEACHER", "FACULTY", "ADMIN", "HOD")

                // All other SmartAttend APIs require an authenticated session
                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow configured React frontend origin(s) with credentials (cookies)
        List<String> origins = Arrays.stream(frontendOrigin.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
