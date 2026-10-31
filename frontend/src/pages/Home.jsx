import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import "./Home.css";

const steps = [
  { title: "Find your favourites", text: "Browse the menu, check availability, and add something delicious to your cart." },
  { title: "Order ahead", text: "Place your order and receive your own token number. Your meal is now in the kitchen's queue." },
  { title: "Track, then collect", text: "Check your order status in My Orders. When it is ready, collect it with your token." },
];

function Home() {
  const { user, loading } = useAuth();
  const dashboard = user?.role === "admin" ? "/admin" : user?.role === "staff" ? "/staff" : "/menu";
  const primaryTo = user ? dashboard : "/register";
  const primaryLabel = user?.role === "admin" || user?.role === "staff" ? "Open your dashboard" : user ? "Explore the menu" : "Start your first order";

  return <main className="home-page">
    <section className="home-hero container" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> PRE-ORDERING & QUEUE TRACKING</p>
        <h1 id="hero-title">Good food.<br />Your time.<br /><em>No standing in line.</em></h1>
        <p className="hero-description">Meet BiteLine. Order before you arrive, get your token, and follow your meal from the kitchen to collection. Make room for lunch, not the queue.</p>
        <div className="hero-actions">{!loading && <Link className="button button-primary" to={primaryTo}>{primaryLabel}<span aria-hidden="true">↗</span></Link>}<a className="button button-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
        <p className="hero-note">Choose your meal. Keep your day moving.</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-topline"><span>MADE FOR YOUR LUNCH BREAK</span><span>✳</span></div>
        <div className="meal-plate"><div className="meal-rice" /><div className="meal-greens"><i /><i /><i /><i /></div><div className="meal-grill"><i /><i /><i /></div><div className="meal-tomato tomato-one" /><div className="meal-tomato tomato-two" /><div className="meal-lemon" /></div>
        <div className="art-caption"><span>LESS QUEUING.</span><strong>More enjoying.</strong></div>
        <div className="art-tag"><span>✓</span> A little planning.<br />A better lunch break.</div>
      </div>
    </section>

    <section className="home-promise"><div className="container"><span>ORDER BEFORE YOU ARRIVE</span><span>YOUR OWN COLLECTION TOKEN</span><span>PREPARATION STATUS AT A GLANCE</span></div></section>

    <section className="home-how container" id="how-it-works">
      <PageHeader as="h2" eyebrow="A BETTER WAY TO TAKE A BREAK" title="Your next meal, in three steps." description="From a craving to collection, BiteLine keeps things simple." />
      <div className="how-grid">{steps.map((step, index) => <article className="how-card" key={step.title}><span className="step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
    </section>

    <section className="home-tracking container">
      <div className="tracking-explainer"><p className="eyebrow">KNOW WHERE YOUR ORDER STANDS</p><h2>Less wondering.<br />More getting on with your day.</h2><p>Your token identifies your order. Follow its preparation status in My Orders and refresh whenever you want an update.</p><p>No need to wait at the counter to find out if your meal is ready.</p></div>
      <div className="tracking-card"><p className="eyebrow">FROM KITCHEN TO COLLECTION</p><h3>A clear path to your next bite</h3><ol>{[["Pending", "Your order has been placed."], ["Accepted", "The kitchen has accepted your order."], ["Preparing", "Your food is being prepared."], ["Ready", "Time to collect with your token."]].map(([title, text], index) => <li key={title}><span className="tracking-step">{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol><p className="tracking-footnote">How order tracking works · not a live order</p></div>
    </section>

    <section className="home-final container"><div><p className="eyebrow">A GOOD MEAL STARTS HERE</p><h2>Skip the wait.<br />Keep the good part.</h2><p>Plan your order, track its progress, and enjoy your food.</p></div>{!loading && <Link className="button button-primary" to={primaryTo}>{primaryLabel} <span aria-hidden="true">↗</span></Link>}</section>
    <footer className="home-footer container"><strong>BiteLine</strong><span>Pre-Ordering & Queue Tracking</span><a href="#hero-title">Back to top ↑</a></footer>
  </main>;
}

export default Home;
