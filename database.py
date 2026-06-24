import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///instance/ctf.db')  # Vercel will set this

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Winner(Base):
    __tablename__ = "winners"
    id = Column(Integer, primary_key=True)
    session_id = Column(String, unique=True)
    claimed_at = Column(DateTime, default=datetime.utcnow)

class GlobalCounter(Base):
    __tablename__ = "global_counter"
    id = Column(Integer, primary_key=True)
    total = Column(Integer, default=0)

class Leaderboard(Base):
    __tablename__ = "leaderboard"
    id = Column(Integer, primary_key=True)
    callsign = Column(String, unique=True)
    solved_stages = Column(Text, default='[]')
    solved_count = Column(Integer, default=0)
    elapsed_seconds = Column(Integer, default=0)
    session_start = Column(DateTime, nullable=True)
    session_end = Column(DateTime, nullable=True)
    status = Column(String, default='ACTIVE')
    score = Column(Integer, default=0)
    claimed_at = Column(DateTime, nullable=True)
    completion_time = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def increment_winner_count(session_id):
    db = SessionLocal()
    try:
        existing = db.query(Winner).filter(Winner.session_id == session_id).first()
        if existing:
            return get_total_winners()
        db.add(Winner(session_id=session_id))
        counter = db.query(GlobalCounter).first()
        if not counter:
            counter = GlobalCounter(id=1, total=0)
            db.add(counter)
        counter.total += 1
        db.commit()
        return counter.total
    finally:
        db.close()

def get_total_winners():
    db = SessionLocal()
    try:
        counter = db.query(GlobalCounter).first()
        return counter.total if counter else 0
    finally:
        db.close()

def create_or_update_session(callsign, start=True):
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        if start:
            player = db.query(Leaderboard).filter(Leaderboard.callsign == callsign).first()
            if player:
                player.session_start = now
                player.status = 'ACTIVE'
            else:
                db.add(Leaderboard(
                    callsign=callsign,
                    session_start=now,
                    status='ACTIVE',
                    solved_stages='[]',
                    solved_count=0,
                    score=0,
                    elapsed_seconds=0
                ))
            db.commit()
    finally:
        db.close()

def quit_session(callsign):
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        player = db.query(Leaderboard).filter(Leaderboard.callsign == callsign).first()
        if player:
            if player.session_start:
                duration = int((now - player.session_start).total_seconds())
                player.completion_time = duration
            player.session_end = now
            player.status = 'QUIT'
            db.commit()
    finally:
        db.close()

def get_player_by_callsign(callsign):
    db = SessionLocal()
    try:
        player = db.query(Leaderboard).filter(Leaderboard.callsign == callsign).first()
        return {c.name: getattr(player, c.name) for c in player.__table__.columns} if player else None
    finally:
        db.close()

def claim_prize_db(callsign):
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        player = db.query(Leaderboard).filter(Leaderboard.callsign == callsign).first()
        if player:
            player.status = 'COMPLETED'
            player.claimed_at = now
            if player.session_start:
                player.completion_time = int((now - player.session_start).total_seconds())
            db.commit()
    finally:
        db.close()

def update_player_progress_db(callsign, solved_stages, elapsed_seconds):
    db = SessionLocal()
    try:
        player = db.query(Leaderboard).filter(Leaderboard.callsign == callsign).first()
        if player:
            player.solved_stages = json.dumps(solved_stages)
            player.solved_count = len(solved_stages)
            player.score = len(solved_stages) * 500
            player.elapsed_seconds = elapsed_seconds
            player.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

def get_leaderboard():
    db = SessionLocal()
    try:
        players = db.query(Leaderboard).order_by(
            Leaderboard.score.desc(),
            Leaderboard.solved_count.desc(),
            Leaderboard.completion_time.asc().nullslast()
        ).all()
        result = []
        for p in players:
            result.append({
                'callsign': p.callsign,
                'solved_count': p.solved_count,
                'score': p.score,
                'status': p.status,
                'elapsed_seconds': p.elapsed_seconds,
                'completion_time': p.completion_time,
                'session_start': p.session_start,
                'session_end': p.session_end,
                'claimed_at': p.claimed_at
            })
        return result
    finally:
        db.close()