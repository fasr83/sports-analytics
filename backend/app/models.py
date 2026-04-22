from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class League(Base):
    __tablename__ = "leagues"
    id = Column(String, primary_key=True)  # e.g. "PL"
    name = Column(String, nullable=False)
    country = Column(String)
    season = Column(String)
    matches = relationship("Match", back_populates="league")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    short_name = Column(String)
    crest = Column(String)
    league_id = Column(String, ForeignKey("leagues.id"))
    attack_rating = Column(Float, default=1.0)
    defense_rating = Column(Float, default=1.0)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True)
    league_id = Column(String, ForeignKey("leagues.id"))
    league = relationship("League", back_populates="matches")
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    home_team_id = Column(Integer)
    away_team_id = Column(Integer)
    match_date = Column(DateTime)
    status = Column(String)  # SCHEDULED, FINISHED, IN_PLAY
    home_goals = Column(Integer, nullable=True)
    away_goals = Column(Integer, nullable=True)
    # Model predictions
    prob_home = Column(Float, nullable=True)
    prob_draw = Column(Float, nullable=True)
    prob_away = Column(Float, nullable=True)
    model_odds_home = Column(Float, nullable=True)
    model_odds_draw = Column(Float, nullable=True)
    model_odds_away = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OddsSnapshot(Base):
    __tablename__ = "odds_snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    bookmaker = Column(String)
    odds_home = Column(Float)
    odds_draw = Column(Float)
    odds_away = Column(Float)
    captured_at = Column(DateTime, default=datetime.utcnow)
    is_value_home = Column(Boolean, default=False)
    is_value_draw = Column(Boolean, default=False)
    is_value_away = Column(Boolean, default=False)
    value_home = Column(Float, default=0.0)
    value_draw = Column(Float, default=0.0)
    value_away = Column(Float, default=0.0)
