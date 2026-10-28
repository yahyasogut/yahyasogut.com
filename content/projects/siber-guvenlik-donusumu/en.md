---
title: Enterprise IT Security Transformation
date: 2026-09-14
summary: From firewalls to DLP, Microsoft 365 MFA to OT security — a multi-layered transformation bringing 5 companies and 10 locations under one security standard.
tags: [IT Security, OT Security, MFA, DLP, MDM, Identity Management]
role: Project Lead
status: In progress
---
Ankutsan Group spans 5 companies and 10 locations: plants, recycling and pallet facilities, a warehouse and an office. Each site has its own network, users and production systems. To bring this distributed setup under **one security standard**, we treated security not as a single product but as complementary layers.

## Why?

Production lines, ERP, email and mobile devices are now all connected. A gap at one site can affect the whole group. We had three goals:

- Shrink the attack surface **to the same level at every location**
- Make it **visible** who accesses critical data, from where and on which device
- Protect **IT and OT** together without stopping production

## Scope: the layers of security

### 1. Network: Firewalls
We deployed next-generation firewalls at every location with a common, centrally managed policy set. Inter-site traffic, internet egress and remote access are all governed by one rule logic.

### 2. DNS security
Requests to malicious domains, phishing pages and command-and-control servers are blocked at the DNS level before a connection is even made, acting as the first line of defence even if a user clicks a bad link.

### 3. Identity: Microsoft 365 MFA and Authenticator
Multi-factor authentication with **Microsoft Authenticator** is mandatory for every Microsoft 365 user. A password alone is no longer enough, and suspicious sign-ins are stopped before a session opens.

### 4. Authorisation
Instead of "everyone can access everything", we apply **role-based, least-privilege** access. Permissions follow job roles and are reviewed regularly, tied to joiner, mover and leaver processes.

### 5. Data: DLP (Data Loss Prevention)
DLP rules prevent sensitive data (financial, commercial, personal) from leaving uncontrolled via email, cloud or external devices. The goal is not to block users but to spot risky behaviour instantly and guide them.

### 6. Mobile: MDM (Mobile Device Management)
Phones and tablets that access company data are centrally managed: encryption, screen lock, app policies and remote wipe for lost devices.

### 7. Production: OT and IT security
Plant automation (OT) networks are separated from the corporate (IT) network with a layered design. Access to production systems happens only through defined, controlled and logged points, and ERP and MES integrations run through these secure gateways.

## Approach

- **One standard, 10 locations:** the same policies and monitoring everywhere instead of a different solution per site
- **Phased rollout:** pilot site first, then roll-out, without stopping production
- **Visibility:** security events and access logs are monitored centrally
- **The human factor:** technical controls backed by user awareness and phishing training

> Security is not a product; it is a habit you keep every day.

## Outcome

Today every location in the group is protected by the same security layers. Identity, network, data, mobile devices and production are managed as one whole. Incidents are spotted earlier and audit preparation is easier. Most importantly, whenever a new site or system is added, the standard to apply is already in place.
