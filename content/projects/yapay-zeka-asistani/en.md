---
title: ANKAGPT — In-House AI Assistant
date: 2026-07-02
summary: A GPT platform we built around Ankutsan's needs. It runs on-premise, makes the company's knowledge available on a permission basis, and is designed around ISO 27001 and data security.
tags: [AI, Enterprise GPT, Knowledge Management, ISO 27001, Data Security, WhatsApp Bot]
role: Product Owner
status: Live · In development
---
As AI tools rapidly enter the workplace, companies face two options: watch employees move company data into external services without control, or meet that need with a **secure platform the company owns**. **ANKAGPT** is the project where we chose the second path.

## Why?

- Employees' need for GPT-based tools was real and growing.
- Procedures, technical documents, quality records and process knowledge were scattered across systems; finding the right information took time.
- Sending company data to external services was unacceptable from a **data security and privacy** standpoint.

The goal was clear: meet the company's GPT needs and bring the **company's knowledge memory** into one assistant, where everyone can access only what they are authorised to see.

## What is ANKAGPT?

An AI assistant built in-house around Ankutsan's needs, **running on-premise**. Users ask questions in natural language; ANKAGPT answers from the company's own documents and shows its sources.

> The company's knowledge stays in the company; access opens to everyone according to their permissions.

## Architecture

1. **User channels:** a web interface, plus a WhatsApp bot on the roadmap
2. **Identity and permissions:** every user signs in with their corporate identity; their role and department determine what they can access.
3. **Corporate knowledge layer:** procedures, instructions, technical documents and guides are processed into a searchable knowledge base.
4. **AI layer:** the language model runs on local servers and answers using only content from sources the user is authorised to see.
5. **Security and logging:** access and usage are logged, and all data processing stays within company boundaries.

## Security and compliance

- **Runs locally:** data and model live on company infrastructure; no content is sent to external services.
- **Designed for ISO 27001:** information security management requirements and data security policies were built into the architecture from day one.
- **Permission-aware access:** the assistant never uses a document in its answer that the user cannot see in the source systems.
- **Traceability:** who accessed which source and when is logged, and answers cite their sources.

## Use cases

- **IT support:** FAQs, password and access processes, device and software usage
- **Procedures and instructions:** fast access to quality, health & safety and operations documents
- **Enterprise systems:** user guides and step-by-step help for SAP and other applications
- **Writing and summarising:** drafting emails, reports and meeting notes, and summarising long documents

## Roadmap: WhatsApp bot

The same architecture will also serve employees through a **WhatsApp bot**. Employees on the shop floor, on shift or away from a desk will be able to:

- reach procedures and instructions instantly,
- open and track IT support requests,
- access company announcements and information,

all without needing a computer. The bot will follow the same **permission and security rules** as the web interface.

## Outcome and ongoing work

ANKAGPT meets the company's GPT needs securely, improving both **productivity** and **access to knowledge**. Finding the right information takes less time, scattered knowledge is reachable from one place, and company data stays under control.

The platform keeps evolving as a living product:

- adding new departments and document sets to the knowledge base
- continuously improving answer quality with user feedback
- launching the WhatsApp bot
- expanding integrations with enterprise systems (ERP, IT support, HR)
