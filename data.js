/* data.js — the chronological dataset the Throughline reads. ONE global,
   classic script — no type=module, no fetch(), no import (file:// law,
   references/design-tokens.md § "Modular structure"). index.html loads this
   BEFORE portfolio.js, so window.HOPE_DATA exists when the script runs.

   AUTHORING CONTRACT (generator side: skills/portfolio/SKILL.md):

   window.HOPE_DATA.timeline — ordered array, one entry per Experience /
   Education / Project / Certification, each:
     {
       id:         string — unique slug; the entry's card in index.html
                   carries the matching stable anchor id="tl-<id>"
       type:       "experience" | "education" | "project" | "certification"
       date_start: "YYYY-MM"
       date_end:   "YYYY-MM" | null            (null = ongoing)
       label:      short phrase, ≤40 chars (e.g. "Lead AI Engineer @ EY") —
                   never a sentence
       org:        string | null
       domain:     string | null               (favicon lookup)
       metric:     string | null               (one short line)
       skills:     [string]                    (≤4)
       pane:       "experience" | "education" | "projects" | "certifications"
                   — the section pane holding the entry's card
       anchor:     the DOM id of the target card in index.html ("tl-<id>")
       featured:   OPTIONAL true — surface this entry in the Overview
                   "Highlights" board (a compact card that jumps to it)
     }

   window.HOPE_DATA.traveler — the playhead glyph:
     "dot"               default — the soft orange glow dot
     "<slug>"            one of assets/icons/travelers/ (paper-plane, car,
                         train, sailboat, bicycle, rocket, footprints)
     { inline: "<svg…>" } a custom/found traveler, inlined by the generator

   window.HOPE_DATA.social — OPTIONAL (present only when the Social Feed app is
   added; omit the key entirely otherwise). Array, one entry per featured post:
     {
       platform: "youtube" | "vimeo" | "spotify" | "soundcloud" | "applemusic" |
                 "figma" | "codepen" | "loom" | "bluesky" | "linkedin" |
                 "substack" | "flickr" | "tiktok" | "instagram" | "x" |
                 "threads" | "pinterest" | "dribbble" | "behance" | "medium" |
                 "gist" | "link"      ("link" = generic link card, any URL)
       url:      string — the public permalink; the renderer derives the embed
       title:    string | null — label for the always-present "View on …" link
       caption:  string | null — one short line shown above the embed
       pinned:   boolean        — true surfaces this post in the Overview
                                  "Latest from" strip (max 2); optional
     }
   portfolio.js renders these into #social-grid: a live embed where the platform
   supports it, ALWAYS with a "View on …" link as the fallback — embeds need the
   published https site + a connection, so offline / file:// shows the link only.
   Social posts are NOT career events: they carry no tl- id and never appear on
   the Throughline.

   The portfolio skill substitutes the timeline_data_json slot below with the
   generated timeline array. The template ships the empty-array placeholder
   after the comment slot so this file is valid JS as-is (node --check passes). */
window.HOPE_DATA = {
  "timeline": [
  {
    "id": "google-r",
    "type": "certification",
    "date_start": null,
    "date_end": null,
    "label": "Data Analysis with R",
    "org": "Google",
    "domain": "google.com",
    "metric": null,
    "skills": [],
    "pane": "certifications",
    "anchor": "tl-google-r"
  },
  {
    "id": "google-ask",
    "type": "certification",
    "date_start": null,
    "date_end": null,
    "label": "Ask Questions: Data Decisions",
    "org": "Google",
    "domain": "google.com",
    "metric": null,
    "skills": [],
    "pane": "certifications",
    "anchor": "tl-google-ask"
  },
  {
    "id": "google-foundations",
    "type": "certification",
    "date_start": null,
    "date_end": null,
    "label": "Foundations: Data Everywhere",
    "org": "Google",
    "domain": "google.com",
    "metric": null,
    "skills": [],
    "pane": "certifications",
    "anchor": "tl-google-foundations"
  },
  {
    "id": "codio-oop",
    "type": "certification",
    "date_start": null,
    "date_end": null,
    "label": "OOP Python: Inheritance",
    "org": "Codio",
    "domain": "codio.com",
    "metric": null,
    "skills": [],
    "pane": "certifications",
    "anchor": "tl-codio-oop"
  },
  {
    "id": "btech-nitc",
    "type": "education",
    "date_start": "2016-08",
    "date_end": "2020-05",
    "label": "B.Tech ECE @ NIT Calicut",
    "org": "National Institute of Technology (NIT) Calicut",
    "domain": "nitc.ac.in",
    "metric": null,
    "skills": [],
    "pane": "education",
    "anchor": "tl-btech-nitc"
  },
  {
    "id": "chola",
    "type": "experience",
    "date_start": "2018-05",
    "date_end": "2018-06",
    "label": "IT-Ops Intern @ Chola",
    "org": "Cholamandalam Investment and Finance Company Limited",
    "domain": "cholamandalam.com",
    "metric": null,
    "skills": [
      "Cloud Computing"
    ],
    "pane": "experience",
    "anchor": "tl-chola"
  },
  {
    "id": "auckam",
    "type": "experience",
    "date_start": "2019-05",
    "date_end": "2019-06",
    "label": "Embedded Systems Intern @ Auckam",
    "org": "Auckam",
    "domain": null,
    "metric": null,
    "skills": [
      "Embedded Systems",
      "MQTT",
      "Azure IoT Hub"
    ],
    "pane": "experience",
    "anchor": "tl-auckam"
  },
  {
    "id": "novartis",
    "type": "experience",
    "date_start": "2020-08",
    "date_end": "2022-07",
    "label": "Business Analyst @ Novartis",
    "org": "Novartis Healthcare",
    "domain": "novartis.com",
    "metric": "10%",
    "skills": [
      "Statistical Analysis & Optimization (MINLP, ARIMA)",
      "Python",
      "SQL (PostgreSQL, Oracle, BigQuery, Azure SQL)"
    ],
    "pane": "experience",
    "anchor": "tl-novartis"
  },
  {
    "id": "iowa",
    "type": "experience",
    "date_start": "2022-08",
    "date_end": "2024-05",
    "label": "Data Scientist @ U. of Iowa",
    "org": "University of Iowa",
    "domain": "uiowa.edu",
    "metric": "80%",
    "skills": [
      "PySpark / Dask / Polars / Pandas",
      "Statistical Analysis & Optimization (MINLP, ARIMA)",
      "Python",
      "SQL (PostgreSQL, Oracle, BigQuery, Azure SQL)"
    ],
    "pane": "experience",
    "anchor": "tl-iowa"
  },
  {
    "id": "msba-iowa",
    "type": "education",
    "date_start": "2022-08",
    "date_end": "2024-05",
    "label": "M.S. Business Analytics @ Iowa",
    "org": "University of Iowa",
    "domain": "uiowa.edu",
    "metric": null,
    "skills": [],
    "pane": "education",
    "anchor": "tl-msba-iowa",
    "featured": true
  },
  {
    "id": "az900",
    "type": "certification",
    "date_start": "2023-12",
    "date_end": "2023-12",
    "label": "AZ-900 Azure Fundamentals",
    "org": "Microsoft",
    "domain": "microsoft.com",
    "metric": null,
    "skills": [],
    "pane": "certifications",
    "anchor": "tl-az900"
  },
  {
    "id": "clinical-trial",
    "type": "project",
    "date_start": "2024-03",
    "date_end": "2024-03",
    "label": "Clinical Trial Matching Engine",
    "org": "Builder",
    "domain": null,
    "metric": null,
    "skills": [
      "RAG Pipelines",
      "NER (SciSpacy, BERT)",
      "SciSpacy",
      "Fine-tuning LLMs"
    ],
    "pane": "projects",
    "anchor": "tl-clinical-trial"
  },
  {
    "id": "careerx",
    "type": "experience",
    "date_start": "2024-08",
    "date_end": "2024-12",
    "label": "Founder & CTO @ CareerX",
    "org": "CareerX, Inc.",
    "domain": "careerx.app",
    "metric": "$250K",
    "skills": [
      "LangChain",
      "Graph Database (Neo4j)",
      "Azure OpenAI (GPT-4)",
      "RAG Pipelines"
    ],
    "pane": "experience",
    "anchor": "tl-careerx"
  },
  {
    "id": "careerx-platform",
    "type": "project",
    "date_start": "2024-08",
    "date_end": "2024-12",
    "label": "CareerX — AI Career Platform",
    "org": "Founder & CTO",
    "domain": "careerx.app",
    "metric": "90% / 95%",
    "skills": [
      "Azure OpenAI (GPT-4)",
      "Graph Database (Neo4j)",
      "RAG Pipelines",
      "LangChain"
    ],
    "pane": "projects",
    "anchor": "tl-careerx-platform"
  },
  {
    "id": "ey",
    "type": "experience",
    "date_start": "2025-01",
    "date_end": null,
    "label": "Lead AI Engineer @ EY",
    "org": "EY",
    "domain": "ey.com",
    "metric": "5 of 10+",
    "skills": [
      "Multi-Agent Orchestration",
      "Rapid Prototyping",
      "Python",
      "Azure OpenAI (GPT-4)"
    ],
    "pane": "experience",
    "anchor": "tl-ey",
    "featured": true
  },
  {
    "id": "image-gen",
    "type": "project",
    "date_start": "2025-02",
    "date_end": "2025-02",
    "label": "AI Image Generation App",
    "org": "Builder / Full-Stack Engineer",
    "domain": null,
    "metric": "100K+",
    "skills": [
      "FastAPI",
      "React",
      "Azure OpenAI (GPT-4)",
      "Image Generation"
    ],
    "pane": "projects",
    "anchor": "tl-image-gen"
  },
  {
    "id": "enterprise-agent",
    "type": "project",
    "date_start": "2025-03",
    "date_end": "2025-03",
    "label": "Enterprise Agent Platform",
    "org": "Core Contributor / Platform Engineer",
    "domain": null,
    "metric": "15+",
    "skills": [
      "LangGraph",
      "Autogen",
      "MCP Protocol",
      "A2A Protocol"
    ],
    "pane": "projects",
    "anchor": "tl-enterprise-agent"
  },
  {
    "id": "multi-agent-engine",
    "type": "project",
    "date_start": "2025-04",
    "date_end": "2025-04",
    "label": "Multi-Agent Workflow Engine",
    "org": "Architect / Builder",
    "domain": null,
    "metric": "3 weeks → 2 days",
    "skills": [
      "Autogen",
      "MCP Protocol",
      "Multi-Agent Orchestration",
      "Azure OpenAI (GPT-4)"
    ],
    "pane": "projects",
    "anchor": "tl-multi-agent-engine"
  },
  {
    "id": "autonomous-inspection",
    "type": "project",
    "date_start": "2025-05",
    "date_end": "2025-05",
    "label": "Autonomous Inspection Platform",
    "org": "Lead AI Engineer / Builder",
    "domain": null,
    "metric": "$2M+",
    "skills": [
      "Unitree GO2 SDK",
      "ROS2 / CycloneDDS",
      "Azure IoT Hub",
      "Azure OpenAI (GPT-4)"
    ],
    "pane": "projects",
    "anchor": "tl-autonomous-inspection",
    "featured": true
  },
  {
    "id": "art-of-living",
    "type": "project",
    "date_start": "2025-06",
    "date_end": null,
    "label": "Art of Living AI Assistant",
    "org": "Builder / AI Engineer",
    "domain": "artofliving.org",
    "metric": "500M+",
    "skills": [
      "OpenAI Realtime API",
      "FastAPI",
      "React",
      "MCP Protocol"
    ],
    "pane": "projects",
    "anchor": "tl-art-of-living",
    "featured": true
  }
],
  "traveler": "footprints",
  "social": [
    {
      "platform": "instagram",
      "url": "https://www.instagram.com/p/DZfFoZQu_Mr/",
      "title": "Building in public",
      "caption": "GenAI in the wild — what it looks like when AI actually ships.",
      "pinned": true
    },
    {
      "platform": "instagram",
      "url": "https://www.instagram.com/p/DZOZiqIN_Vs/",
      "title": "AI at EY's Global Summit",
      "caption": "Senior leaders getting their hands dirty building agents. This is the shift.",
      "pinned": true
    },
    {
      "platform": "instagram",
      "url": "https://www.instagram.com/p/DZImFSAE1W0/",
      "title": "Autonomous Inspection Platform",
      "caption": null,
      "pinned": false
    },
    {
      "platform": "linkedin",
      "url": "https://www.linkedin.com/in/oneconsciousness",
      "title": "LinkedIn",
      "caption": "AI @EY · Founder @Hope",
      "pinned": false
    },
    {
      "platform": "github",
      "url": "https://github.com/oneconsciousness",
      "title": "GitHub",
      "caption": "Building in public",
      "pinned": false
    }
  ]
};
