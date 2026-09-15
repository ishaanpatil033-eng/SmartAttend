package com.smartattend.backend.dtos;

public class MoodleCourseDto {

    private Long id;
    private String shortname;
    private String fullname;
    private String idnumber;

    public MoodleCourseDto() {
    }

    public MoodleCourseDto(Long id, String shortname, String fullname, String idnumber) {
        this.id = id;
        this.shortname = shortname;
        this.fullname = fullname;
        this.idnumber = idnumber;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getShortname() {
        return shortname;
    }

    public void setShortname(String shortname) {
        this.shortname = shortname;
    }

    public String getFullname() {
        return fullname;
    }

    public void setFullname(String fullname) {
        this.fullname = fullname;
    }

    public String getIdnumber() {
        return idnumber;
    }

    public void setIdnumber(String idnumber) {
        this.idnumber = idnumber;
    }
}
