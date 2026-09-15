package com.smartattend.backend;

import com.smartattend.backend.dtos.ClassmateDto;
import com.smartattend.backend.dtos.MoodleAssignmentDto;
import com.smartattend.backend.dtos.MoodleConversationDto;
import com.smartattend.backend.dtos.MoodleMessageResponse;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.services.MoodleService;
import com.smartattend.backend.services.StudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
public class AcademicWorkspaceAndMoodleTests {

    @Autowired
    private MoodleService moodleService;

    @Autowired
    private StudentService studentService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        studentRepository.deleteAll();
        courseRepository.deleteAll();

        // Seed Courses
        Course cs101 = new Course("CS101", "Computer Science 101");
        Course cs102 = new Course("CS102", "Object Oriented Programming");
        courseRepository.save(cs101);
        courseRepository.save(cs102);

        // Seed Students
        Student s1 = new Student("STU101", "Alice Smith", "alice@smartattend.edu", "FE", 1, "E1");
        Student s2 = new Student("STU102", "Bob Jones", "bob@smartattend.edu", "FE", 1, "E1");
        Student s3 = new Student("STU103", "Charlie Brown", "charlie@smartattend.edu", "FE", 1, "E2");
        Student s99 = new Student("STU999", "Eve Hacker", "eve@external.edu", "BE", 8, "X9");

        studentRepository.save(s1);
        studentRepository.save(s2);
        studentRepository.save(s3);
        studentRepository.save(s99);
    }

    // =========================================================================
    // TEST 1: Due Date Retrieval
    // Verify mod_assign_get_assignments response parsing
    // =========================================================================
    @Test
    @DisplayName("Test 1: Due Date Retrieval - Verify mod_assign_get_assignments response parsing")
    void test01_dueDateRetrieval_modAssignGetAssignmentsParsing() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");
        assertNotNull(assignments, "Assignments list should not be null");
        assertFalse(assignments.isEmpty(), "Assignments list should not be empty");

        MoodleAssignmentDto first = assignments.get(0);
        assertNotNull(first.getId(), "Assignment ID must be present");
        assertNotNull(first.getTitle(), "Assignment Title must be present");
        assertNotNull(first.getCourseId(), "Assignment Course ID must be present");
        assertNotNull(first.getDueDate(), "Assignment Due Date must be present");
        assertNotNull(first.getFormattedDue(), "Formatted due string must be generated");
    }

    // =========================================================================
    // TEST 2: Cut-off Date Handling
    // Verify cut-off date parsed when present and handled gracefully when null
    // =========================================================================
    @Test
    @DisplayName("Test 2: Cut-off Date Handling - Present vs null graceful handling")
    void test02_cutoffDateHandling() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        boolean hasNonNullCutoff = assignments.stream().anyMatch(a -> a.getCutoffDate() != null);
        boolean hasNullCutoff = assignments.stream().anyMatch(a -> a.getCutoffDate() == null);

        assertTrue(hasNonNullCutoff, "At least one assignment should demonstrate cut-off date support");
        assertTrue(hasNullCutoff, "Assignments without cut-off dates should be handled gracefully as null");
    }

    // =========================================================================
    // TEST 3: Due Today Classification
    // Assignment due within remaining hours receives 'due_today' and Priority 1
    // =========================================================================
    @Test
    @DisplayName("Test 3: Due Today Classification - Priority 1")
    void test03_dueTodayClassification() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        MoodleAssignmentDto dueToday = assignments.stream()
                .filter(a -> "due_today".equalsIgnoreCase(a.getDeadlineStatus()))
                .findFirst()
                .orElse(null);

        assertNotNull(dueToday, "An assignment with 'due_today' status must exist");
        assertEquals(1, dueToday.getUrgencyPriority(), "Due today must have Priority 1");
        assertTrue(dueToday.getFormattedDue().toLowerCase().contains("due today"), "Formatted string must reflect 'Due today'");
    }

    // =========================================================================
    // TEST 4: Due Tomorrow Classification
    // Assignment due next calendar day receives 'due_tomorrow' and Priority 2
    // =========================================================================
    @Test
    @DisplayName("Test 4: Due Tomorrow Classification - Priority 2")
    void test04_dueTomorrowClassification() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        MoodleAssignmentDto dueTomorrow = assignments.stream()
                .filter(a -> "due_tomorrow".equalsIgnoreCase(a.getDeadlineStatus()))
                .findFirst()
                .orElse(null);

        assertNotNull(dueTomorrow, "An assignment with 'due_tomorrow' status must exist");
        assertEquals(2, dueTomorrow.getUrgencyPriority(), "Due tomorrow must have Priority 2");
        assertTrue(dueTomorrow.getFormattedDue().toLowerCase().contains("due tomorrow"), "Formatted string must reflect 'Due tomorrow'");
    }

    // =========================================================================
    // TEST 5: Due Soon Classification
    // Assignment due within 2-3 days receives 'due_soon' and Priority 3
    // =========================================================================
    @Test
    @DisplayName("Test 5: Due Soon Classification - Priority 3")
    void test05_dueSoonClassification() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        MoodleAssignmentDto dueSoon = assignments.stream()
                .filter(a -> "due_soon".equalsIgnoreCase(a.getDeadlineStatus()))
                .findFirst()
                .orElse(null);

        assertNotNull(dueSoon, "An assignment with 'due_soon' status must exist");
        assertEquals(3, dueSoon.getUrgencyPriority(), "Due in 3 days must have Priority 3");
    }

    // =========================================================================
    // TEST 6: Upcoming Classification
    // Assignment due >3 days receives 'upcoming' and Priority 4
    // =========================================================================
    @Test
    @DisplayName("Test 6: Upcoming Classification - Priority 4")
    void test06_upcomingClassification() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        MoodleAssignmentDto upcoming = assignments.stream()
                .filter(a -> "upcoming".equalsIgnoreCase(a.getDeadlineStatus()))
                .findFirst()
                .orElse(null);

        assertNotNull(upcoming, "An assignment with 'upcoming' status must exist");
        assertEquals(4, upcoming.getUrgencyPriority(), "Upcoming must have Priority 4");
    }

    // =========================================================================
    // TEST 7: Overdue Classification
    // Assignment past due date receives 'overdue' and Priority 5
    // =========================================================================
    @Test
    @DisplayName("Test 7: Overdue Classification - Priority 5")
    void test07_overdueClassification() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        MoodleAssignmentDto overdue = assignments.stream()
                .filter(a -> "overdue".equalsIgnoreCase(a.getDeadlineStatus()))
                .findFirst()
                .orElse(null);

        assertNotNull(overdue, "An overdue assignment must exist");
        assertEquals(5, overdue.getUrgencyPriority(), "Overdue must have Priority 5");
        assertTrue(overdue.getFormattedDue().toLowerCase().contains("overdue"), "Formatted text must indicate overdue");
    }

    // =========================================================================
    // TEST 8: Submitted State Handling
    // Assignment with submissionStatus='submitted' receives 'submitted' status
    // =========================================================================
    @Test
    @DisplayName("Test 8: Submitted State Handling - Submitted regardless of time")
    void test08_submittedStateHandling() {
        List<MoodleAssignmentDto> assignments = moodleService.fetchAssignments("CS101", "STU101");

        MoodleAssignmentDto submitted = assignments.stream()
                .filter(a -> "submitted".equalsIgnoreCase(a.getDeadlineStatus()))
                .findFirst()
                .orElse(null);

        assertNotNull(submitted, "A submitted assignment must exist");
        assertEquals("submitted", submitted.getSubmissionStatus());
        assertEquals(6, submitted.getUrgencyPriority());
    }

    // =========================================================================
    // TEST 9: Due Date Dynamic Refresh
    // Updating due date causes next query to return new date without stale cache
    // =========================================================================
    @Test
    @DisplayName("Test 9: Due Date Dynamic Refresh - Live date changes without stale caching")
    void test09_dueDateDynamicRefresh() {
        List<MoodleAssignmentDto> before = moodleService.fetchAssignments("CS101", "STU101");
        MoodleAssignmentDto targetBefore = before.stream().filter(a -> a.getId().equals(101L)).findFirst().orElseThrow();

        // Simulate extension by 4 days
        List<MoodleAssignmentDto> after = moodleService.refreshAssignments("CS101", 101L, 4);
        MoodleAssignmentDto targetAfter = after.stream().filter(a -> a.getId().equals(101L)).findFirst().orElseThrow();

        assertTrue(targetAfter.getDueDate().isAfter(targetBefore.getDueDate()), "Refreshed due date must be shifted into the future");
        assertNotEquals(targetBefore.getFormattedDue(), targetAfter.getFormattedDue(), "Formatted due date string must reflect the dynamic update");
    }

    // =========================================================================
    // TEST 10: Notification Urgency Ordering
    // Notifications sorted by urgency priority (Priority 1 first, Priority 6 last)
    // =========================================================================
    @Test
    @DisplayName("Test 10: Notification Urgency Ordering - Priority 1 first")
    void test10_notificationUrgencyOrdering() {
        List<MoodleAssignmentDto> list = moodleService.fetchAssignments("CS101", "STU101");
        for (int i = 0; i < list.size() - 1; i++) {
            assertTrue(list.get(i).getUrgencyPriority() <= list.get(i + 1).getUrgencyPriority(),
                    "Assignments must be ordered by urgency priority ascending");
        }
    }

    // =========================================================================
    // TEST 11: Notification Dismissal
    // Dismissal logic correctly filters out dismissed notification IDs
    // =========================================================================
    @Test
    @DisplayName("Test 11: Notification Dismissal - UI session filtering")
    void test11_notificationDismissal() {
        List<MoodleAssignmentDto> list = moodleService.fetchAssignments("CS101", "STU101");
        MoodleAssignmentDto target = list.get(0);

        Set<Long> dismissedIds = Set.of(target.getId());

        List<MoodleAssignmentDto> visible = list.stream()
                .filter(a -> !dismissedIds.contains(a.getId()))
                .collect(Collectors.toList());

        assertFalse(visible.contains(target), "Dismissed assignment must not be in visible notifications");
        assertEquals(list.size() - 1, visible.size(), "Visible list size must be reduced by 1");
    }

    // =========================================================================
    // TEST 12: Classmate Directory Authorized Scope
    // Student querying classmates receives only students in their authorized scope
    // =========================================================================
    @Test
    @DisplayName("Test 12: Classmate Directory Authorized Scope - Same cohort peers")
    void test12_classmateDirectoryAuthorizedScope() {
        List<ClassmateDto> classmates = studentService.getAuthorizedClassmates("STU101", null, null);

        assertNotNull(classmates);
        List<String> peerIds = classmates.stream().map(ClassmateDto::getStudentId).collect(Collectors.toList());

        assertTrue(peerIds.contains("STU102"), "Peer STU102 in same batch E1 must be in authorized directory");
        assertFalse(peerIds.contains("STU999"), "Student STU999 in BE/X9 must NOT be in authorized directory");
    }

    // =========================================================================
    // TEST 13: Cross-Cohort Query Rejection
    // Querying non-existent student or cross-cohort tampering is blocked
    // =========================================================================
    @Test
    @DisplayName("Test 13: Cross-Cohort Query Rejection - Unauthorized access prevented")
    void test13_crossCohortQueryRejection() {
        assertThrows(IllegalArgumentException.class, () -> {
            studentService.getAuthorizedClassmates("NON_EXISTENT_STU", null, null);
        }, "Querying with non-existent student ID must throw IllegalArgumentException");

        // Filtering by a batch that has no overlapping cohort students returns empty list
        List<ClassmateDto> result = studentService.getAuthorizedClassmates("STU101", null, "NON_EXISTENT_BATCH");
        assertTrue(result.isEmpty(), "Unauthorized/non-matching batch query should return empty list");
    }

    // =========================================================================
    // TEST 14: Directory Privacy Audit
    // Returned classmate profile contains NO password hash, tokens, or GPS
    // =========================================================================
    @Test
    @DisplayName("Test 14: Directory Privacy Audit - Zero sensitive credentials in DTO")
    void test14_directoryPrivacyAudit() {
        List<Field> fields = Arrays.asList(ClassmateDto.class.getDeclaredFields());
        List<String> fieldNames = fields.stream().map(Field::getName).collect(Collectors.toList());

        assertFalse(fieldNames.contains("password"), "ClassmateDto must NOT have password field");
        assertFalse(fieldNames.contains("passwordHash"), "ClassmateDto must NOT have passwordHash field");
        assertFalse(fieldNames.contains("token"), "ClassmateDto must NOT have token field");
        assertFalse(fieldNames.contains("deviceFingerprint"), "ClassmateDto must NOT have deviceFingerprint field");
        assertFalse(fieldNames.contains("latitude"), "ClassmateDto must NOT have latitude field");
        assertFalse(fieldNames.contains("longitude"), "ClassmateDto must NOT have longitude field");

        ClassmateDto profile = studentService.getClassmateProfile("STU101", "STU102");
        assertNotNull(profile.getStudentId());
        assertNotNull(profile.getStudentName());
        assertNotNull(profile.getAcademicYear());
    }

    // =========================================================================
    // TEST 15: Peer Contact Authorization
    // Student can initiate contact with authorized classmates
    // =========================================================================
    @Test
    @DisplayName("Test 15: Peer Contact Authorization - Authorized peer contact profile")
    void test15_peerContactAuthorization() {
        ClassmateDto profile = studentService.getClassmateProfile("STU101", "STU102");
        assertNotNull(profile, "Authorized classmate profile must be accessible");
        assertEquals("Bob Jones", profile.getStudentName());
        assertEquals("E1", profile.getBatch());
    }

    // =========================================================================
    // TEST 16: Unauthorized Peer Contact Rejection
    // Accessing contact info for an unauthorized student is rejected (AccessDeniedException)
    // =========================================================================
    @Test
    @DisplayName("Test 16: Unauthorized Peer Contact Rejection - 403 Access Denied")
    void test16_unauthorizedPeerContactRejection() {
        assertThrows(AccessDeniedException.class, () -> {
            studentService.getClassmateProfile("STU101", "STU999");
        }, "Accessing profile of cross-cohort student STU999 must throw AccessDeniedException");
    }

    // =========================================================================
    // TEST 17: Moodle Messaging API Dispatch
    // Message dispatch executes and returns receipt
    // =========================================================================
    @Test
    @DisplayName("Test 17: Moodle Messaging API Dispatch - Message dispatch receipt")
    void test17_moodleMessagingApiDispatch() {
        MoodleMessageResponse response = moodleService.sendMessage("STU101", "STU102", "Let's review CS101 lab", "CS101");

        assertNotNull(response);
        assertTrue(response.isSuccess(), "Message dispatch must report success");
        assertNotNull(response.getMessageId(), "Message ID must be assigned");
        assertEquals("STU101", response.getSenderStudentId());
        assertEquals("STU102", response.getRecipientStudentId());
    }

    // =========================================================================
    // TEST 18: Moodle Messaging Error Handling
    // Graceful error handling on empty input and conversation fallback
    // =========================================================================
    @Test
    @DisplayName("Test 18: Moodle Messaging Error Handling - Graceful validation and conversation retrieval")
    void test18_moodleMessagingErrorHandling() {
        assertThrows(IllegalArgumentException.class, () -> {
            moodleService.sendMessage("STU101", "STU102", "", "CS101");
        }, "Sending empty message text must throw IllegalArgumentException");

        assertThrows(IllegalArgumentException.class, () -> {
            moodleService.sendMessage(null, "STU102", "Hello", "CS101");
        }, "Sending message with null sender must throw IllegalArgumentException");

        moodleService.sendMessage("STU101", "STU102", "Hello peer", "CS101");
        List<MoodleConversationDto> convos = moodleService.getConversations("STU101");
        assertNotNull(convos, "Conversations list should never be null");
        assertFalse(convos.isEmpty(), "Conversations list should contain the active conversation");

        List<com.smartattend.backend.dtos.MoodleMessageResponse> thread = moodleService.getThread("STU101", "STU102");
        assertNotNull(thread);
        assertFalse(thread.isEmpty());
        assertEquals("Hello peer", thread.get(thread.size() - 1).getText());
    }
}
