"use client";

import { useRef } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, CircuitBoard, FileClock, LockKeyhole, Play, ShieldAlert, Siren } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RiskQueue } from "@/components/command/RiskQueue";
import { assets, eventStream, exposureByPort, incidents, scenario } from "@/lib/security-data";

gsap.registerPlugin(ScrollTrigger);

export default function CommandPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".stack-card");

      gsap.from(".hero-line", {
        yPercent: 110,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: "power4.out"
      });

      gsap.from(".scale-media", {
        scale: 0.82,
        opacity: 0.2,
        filter: "brightness(0.5)",
        scrollTrigger: {
          trigger: ".command-interest",
          start: "top 82%",
          end: "bottom 35%",
          scrub: true
        }
      });

      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 96 + index * 18, scale: 0.95, opacity: 0.42 },
          {
            y: index * -18,
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".command-desire",
              start: "top top",
              end: "+=900",
              scrub: true
            }
          }
        );
      });

      ScrollTrigger.create({
        trigger: ".command-desire",
        start: "top top",
        end: "+=900",
        pin: ".desire-pin"
      });
    },
    { scope: rootRef }
  );

  return (
    <AppShell>
      <main ref={rootRef} className="taste-command overflow-x-hidden">
        <section className="command-hero">
          <div className="hero-copy">
            <div className="hero-kicker">ForgeSentinel for manufacturing security teams</div>
            <h1>
              <span className="hero-line">Industrial risk</span>
              <span className="hero-line">
                with evidence
                <span
                  className="inline-photo"
                  aria-hidden="true"
                  style={{ backgroundImage: "url(https://images.pexels.com/photos/33706880/pexels-photo-33706880.jpeg?auto=compress&cs=tinysrgb&w=420)" }}
                />
                attached.
              </span>
            </h1>
            <p>
              Discover unknown assets, explain exposed services, correlate security events, and write response decisions back into an auditable operational record.
            </p>
            <div className="hero-actions">
              <button className="taste-btn taste-btn-primary"><Play size={17} /> Run safe demo scan</button>
              <button className="taste-btn"><ArrowUpRight size={17} /> Open critical incident</button>
            </div>
          </div>

          <div className="hero-visual group">
            <div
              className="hero-photo"
              style={{ backgroundImage: "url(https://images.pexels.com/photos/31352672/pexels-photo-31352672.jpeg?auto=compress&cs=tinysrgb&w=1200)" }}
            />
            <div className="hero-incident-panel">
              <div className="panel-topline">
                <span className="mono">INC-2404-001</span>
                <RiskBadge level="critical" score={92} />
              </div>
              <h2>Unknown contractor laptop on production exposing SMB/RDP</h2>
              <p>{scenario.replace("Scenario: ", "")}</p>
              <div className="decision-strip">
                <span>Isolate switch port</span>
                <span>Verify owner</span>
                <span>Attach evidence</span>
              </div>
            </div>
          </div>
        </section>

        <section className="command-interest">
          <div className="section-copy">
            <h2>One operating picture. No dead objects.</h2>
            <p>Assets, incidents, recommendations, and replay traces stay connected so analysts can move from signal to action without losing proof.</p>
          </div>
          <div className="command-bento">
            <article className="bento-card bento-risk group">
              <RiskQueue />
            </article>
            <article className="bento-card bento-focus group">
              <div className="card-image scale-media" style={{ backgroundImage: "url(https://images.pexels.com/photos/33706880/pexels-photo-33706880.jpeg?auto=compress&cs=tinysrgb&w=900)" }} />
              <div className="card-body">
                <Siren color="var(--critical)" />
                <h3>Critical incident focus stays attached to evidence.</h3>
                <p>{incidents[0].summary}</p>
              </div>
            </article>
            <article className="bento-card bento-events group">
              <h3>Live security event stream</h3>
              {eventStream.slice(0, 4).map((event) => (
                <div className="taste-event" key={`${event.time}-${event.entity}`}>
                  <span className="mono">{event.time}</span>
                  <strong>{event.event}</strong>
                  <span>{event.entity}</span>
                </div>
              ))}
            </article>
            <article className="bento-card bento-chart group">
              <h3>Exposure drives decisions</h3>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={exposureByPort}>
                  <XAxis dataKey="port" stroke="#8892A3" fontSize={11} />
                  <YAxis stroke="#8892A3" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#121824", border: "1px solid rgba(148,163,184,.18)", borderRadius: 14 }} />
                  <Bar dataKey="risk" fill="#D99A2B" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
            <article className="bento-card bento-scan group">
              <LockKeyhole color="var(--low)" />
              <h3>Safe demo scanning by default.</h3>
              <p>Real network scanning exists only behind explicit opt-in lab mode.</p>
            </article>
          </div>
        </section>

        <section className="command-desire">
          <div className="desire-pin">
            <h2>Analyst motion is the product.</h2>
            <p>ForgeSentinel is built around response loops: observe, normalize, score, correlate, recommend, approve, replay.</p>
          </div>
          <div className="stack-lane">
            {[
              ["Observation captured", "ARP and service probes identify a new MAC on the production VLAN."],
              ["Risk decision generated", "Unauthorized asset + RDP + SMB + production context produce a critical score."],
              ["Recommendation ranked", "Isolation outranks reporting because it removes the lateral movement path first."],
              ["Audit replay preserved", "Every decision can be replayed with actor, timestamp, entity, and raw JSON."]
            ].map(([title, body], index) => (
              <article className="stack-card" key={title}>
                <span className="mono">0{index + 1}</span>
                <CircuitBoard />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="command-action">
          <div>
            <h2>Resolve the highest-risk production exposure with proof.</h2>
            <p>Confirm the true positive, accept the ranked response, isolate the unauthorized asset, and generate the evidence package.</p>
          </div>
          <div className="hero-actions">
            <button className="taste-btn taste-btn-primary"><ShieldAlert size={17} /> Accept recommendation</button>
            <button className="taste-btn"><FileClock size={17} /> Replay audit trail</button>
          </div>
        </section>

        <div className="command-marquee" aria-hidden="true">
          <div>
            Asset intelligence · Risk decisions · Correlated incidents · Audit replay · Safe demo scanning · Lab opt-in controls ·
          </div>
          <div>
            Asset intelligence · Risk decisions · Correlated incidents · Audit replay · Safe demo scanning · Lab opt-in controls ·
          </div>
        </div>
      </main>
      <AssetDetailDrawer />
    </AppShell>
  );
}
