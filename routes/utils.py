from flask import session

def mark_solved(stage_num):
    solved = session.get('solved', [])
    if stage_num not in solved:
        solved.append(stage_num)
        session['solved'] = solved
        session.modified = True
    return True
