"""Task Bingo, Streamlit version. Run with: streamlit run streamline_app.py"""
import html
import json
import random
import time
import uuid
from pathlib import Path

import streamlit as st

STORE = Path(__file__).with_name("tasks.json")
COLORS = ["#e4572e", "#29a3a3", "#f2b705", "#6a4c93", "#3b8ea5", "#7cb518", "#ef476f", "#ff9f1c"]
TOY = [
    ("Write the methods paragraph", "Draft 150 words on the alignment + variant calling steps."),
    ("Clean the sample sheet", "Fix duplicated IDs and inconsistent date formats."),
    ("Run FastQC on batch 2", "Collect the MultiQC report and flag samples with adapter content."),
    ("Refactor plot_volcano()", "Split data wrangling from plotting; add a minimal example."),
    ("Reply to reviewer emails", "Only the ones waiting longer than a week."),
    ("Back up the project folder", "Verify the checksum of the copy."),
    ("Read one paper from the queue", "Take 3 bullet-point notes, no more."),
    ("Tidy the bash pipeline README", "Document inputs, outputs, and the one command to run it."),
]


def toy_tasks():
    return [{"id": uuid.uuid4().hex, "title": t, "description": d, "drawn": False} for t, d in TOY]


def load():
    try:
        return json.loads(STORE.read_text())
    except (OSError, ValueError):
        return toy_tasks()


def save():
    try:
        STORE.write_text(json.dumps(st.session_state.tasks, indent=2))
    except OSError:
        pass  # read-only filesystem: the app still works for this session


def add_task():
    title = st.session_state.new_title.strip()
    if not title:
        return
    st.session_state.tasks.append(
        {"id": uuid.uuid4().hex, "title": title, "description": st.session_state.new_desc.strip(), "drawn": False}
    )
    st.session_state.new_title = st.session_state.new_desc = ""
    save()


def finish_task(task_id):
    st.session_state.tasks = [t for t in st.session_state.tasks if t["id"] != task_id]
    save()


def reset_toy():
    st.session_state.tasks = toy_tasks()
    st.session_state.result = None
    save()


def machine_frame(n_balls=14, spinning=True):
    """One frame of the 'bingo machine': numbered balls at random spots in a globe."""
    balls = []
    for i in range(n_balls):
        x, y = (random.uniform(8, 78), random.uniform(8, 78)) if spinning else (8 + (i % 7) * 10, 62 + (i // 7) * 12)
        balls.append(
            f'<div style="position:absolute;left:{x:.0f}%;top:{y:.0f}%;width:16%;aspect-ratio:1;border-radius:50%;'
            f'background:{COLORS[i % len(COLORS)]};color:#fff;font:bold 12px sans-serif;display:flex;'
            f'align-items:center;justify-content:center">{i + 1}</div>'
        )
    return (
        '<div style="position:relative;width:260px;height:260px;margin:auto;border:6px solid #999;'
        f'border-radius:50%;background:rgba(128,128,128,.08)">{"".join(balls)}</div>'
    )


def draw_task(machine, drop):
    tasks = st.session_state.tasks
    pool = [t for t in tasks if not t["drawn"]]
    new_round = not pool
    if new_round:
        for t in tasks:
            t["drawn"] = False
        pool = tasks
    pick = random.choice(pool)  # chosen up front; the animation is theatre
    for _ in range(24):  # ~2.4 s of tumbling balls
        machine.markdown(machine_frame(), unsafe_allow_html=True)
        time.sleep(0.1)
    machine.markdown(machine_frame(spinning=False), unsafe_allow_html=True)
    drop.markdown(f'<div style="text-align:center;font-size:2rem">🎱</div>', unsafe_allow_html=True)
    time.sleep(0.8)
    pick["drawn"] = True
    save()
    left = sum(not t["drawn"] for t in tasks)
    st.session_state.result = {"task": pick, "left": left, "new_round": new_round}


st.set_page_config(page_title="Task Bingo", page_icon="🎱", layout="wide")
if "tasks" not in st.session_state:
    st.session_state.tasks = load()
    st.session_state.result = None

st.title("🎱 Task Bingo")
col_submit, col_list, col_draw = st.columns(3)

with col_submit:
    st.subheader("1 · Submit a task")
    with st.form("task_form", border=False):
        st.text_input("Title", key="new_title", placeholder="e.g. Align the pilot FASTQs", max_chars=80)
        st.text_area("Description", key="new_desc", placeholder="What does 'done' look like?")
        st.form_submit_button("Add task", on_click=add_task)
    st.button("Reset to toy tasks", on_click=reset_toy, type="tertiary")

with col_list:
    st.subheader(f"2 · Task list ({len(st.session_state.tasks)})")
    if not st.session_state.tasks:
        st.caption("No tasks yet.")
    for t in st.session_state.tasks:
        c_txt, c_chk = st.columns([8, 1], vertical_alignment="top")
        title, desc = html.escape(t["title"]), html.escape(t["description"])
        style = "opacity:.45;text-decoration:line-through" if t["drawn"] else ""
        c_txt.markdown(
            f'<div style="{style}"><b>{title}</b><br><small>{desc}</small></div>', unsafe_allow_html=True
        )
        c_chk.checkbox("Finished", key=f"fin_{t['id']}", label_visibility="collapsed",
                       help="Mark finished (removes it)", on_change=finish_task, args=(t["id"],))

with col_draw:
    st.subheader("3 · Draw a task")
    machine = st.empty()
    machine.markdown(machine_frame(spinning=False), unsafe_allow_html=True)
    drop = st.empty()
    if st.button("Get new task!", type="primary", use_container_width=True):
        if st.session_state.tasks:
            draw_task(machine, drop)
        else:
            st.session_state.result = None
            st.warning("Add a task first.")
    res = st.session_state.result
    if res:
        with st.container(border=True):
            st.markdown(f"### {res['task']['title']}")
            st.write(res["task"]["description"] or "(no description)")
            st.caption(("New round started. " if res["new_round"] else "") + f"{res['left']} left this round")
