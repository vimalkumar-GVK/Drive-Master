from sqlalchemy import Column, Integer, String, LargeBinary, Text, DateTime, Boolean
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, index=True)
    name = Column(String)
    password = Column(String)
    role = Column(String)

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True, unique=True)
    resume_filename = Column(String)
    resume_text = Column(Text)
    skills_json = Column(Text)
    # LinkedIn-style profile fields
    headline = Column(String, nullable=True)
    pronouns = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    location = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    photo_base64 = Column(Text, nullable=True)   # base64 encoded photo
    cover_base64 = Column(Text, nullable=True)   # base64 encoded cover photo
    target_role = Column(String, nullable=True)  # selected target role for gap analysis
    ats_score = Column(Integer, nullable=True)   # general ATS parseability score

class CandidateDocument(Base):
    __tablename__ = "candidate_documents"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    size_mb = Column(String, nullable=False)
    file_base64 = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Certificate(Base):
    __tablename__ = "certificates"
    cert_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    doc_type = Column(String)
    file_data = Column(LargeBinary)

class Template(Base):
    __tablename__ = "templates"
    template_id = Column(String, primary_key=True, index=True)
    template_name = Column(String)
    document_type = Column(String)
    svg_data = Column(LargeBinary)
    template_json = Column(Text)

class Job(Base):
    __tablename__ = "jobs"
    job_id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    company = Column(String)
    description = Column(Text)
    status = Column(String, default="Active")

class Application(Base):
    __tablename__ = "applications"
    app_id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, index=True)
    user_id = Column(String, index=True)
    status = Column(String, default="Applied")

class DeletionRequest(Base):
    __tablename__ = "deletion_requests"
    request_id = Column(Integer, primary_key=True, index=True)
    target_type = Column(String)
    target_name = Column(String)
    requester = Column(String)
    reason = Column(String)
    status = Column(String, default="pending")

class EmailSettings(Base):
    __tablename__ = "email_settings"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String)
    app_password = Column(String)

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    is_group = Column(Integer, default=0) # 0 for 1-on-1, 1 for group
    title = Column(String, nullable=True) # Used for group chats
    created_at = Column(DateTime, default=datetime.utcnow)

class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, index=True)
    user_id = Column(String, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, index=True)
    sender_id = Column(String, index=True)
    text = Column(Text, nullable=False)
    job_id = Column(Integer, nullable=True) # Optional link to a job
    attachment = Column(Text, nullable=True) # base64 or URL attachment
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Connection(Base):
    __tablename__ = "connections"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requester_id = Column(String, index=True)
    receiver_id = Column(String, index=True)
    status = Column(String, default="pending") # pending/accepted/rejected
    created_at = Column(DateTime, default=datetime.utcnow)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    author_id = Column(String, index=True)
    author_name = Column(String)
    author_role = Column(String) # Candidate / HR / RecruitIQ
    content = Column(Text, nullable=False)
    image_base64 = Column(Text, nullable=True)
    video_base64 = Column(Text, nullable=True)
    post_type = Column(String, default="Text") # Text, Image, Job, Achievement
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    job_id = Column(Integer, nullable=True) # If it's a job post conversion or linked job
    created_at = Column(DateTime, default=datetime.utcnow)

class PostLike(Base):
    __tablename__ = "post_likes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, index=True)
    user_id = Column(String, index=True)

class PostComment(Base):
    __tablename__ = "post_comments"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, index=True)
    user_id = Column(String, index=True)
    user_name = Column(String)
    user_photo = Column(Text, nullable=True)
    text = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PostSkillEndorsement(Base):
    __tablename__ = "post_skill_endorsements"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, index=True)
    skill = Column(String, index=True)
    endorser_id = Column(String, index=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)
    text = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
