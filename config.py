import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-super-secret-change-me'
