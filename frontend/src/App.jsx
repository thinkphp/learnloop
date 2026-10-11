import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Check, Clock3, Code2, Database, Flame, GraduationCap, Heart, Menu, Search, Sparkles, Star, Users, X, Zap } from 'lucide-react';

const API = 'http://localhost:8000/api';
const categories = ['All', 'Design', 'Development', 'Data & AI'];
const categoryIcons = { Design: Sparkles, Development: Code2, 'Data & AI': Activity };
const initials = name => name.split(' ').map(part => part[0]).slice(0, 2).join('');

export default function App() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadCourses = useCallback(async (q, c) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, category: c });
      const response = await fetch(`${API}/courses?${params}`);
      if (!response.ok) throw new Error('API unavailable');
      const data = await response.json();
      setCourses(data.items);
      setResult(data);
    } catch { setNotice('The API is unavailable. Start the services with Docker Compose.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadCourses(query, category), 250);
    return () => clearTimeout(timer);
  }, [query, category, loadCourses]);

  const clearCache = async () => {
    try {
      const response = await fetch(`${API}/cache/clear`, { method: 'POST' });
      const data = await response.json();
      setNotice(`Cache cleared · ${data.cleared} ${data.cleared === 1 ? 'key removed' : 'keys removed'}`);
      loadCourses(query, category);
    } catch { setNotice('Redis is unavailable right now.'); }
    setTimeout(() => setNotice(''), 3500);
  };

  const toggleSaved = id => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const openFavorites = () => {
    setShowFavorites(true);
    setQuery('');
    setCategory('All');
    setMenuOpen(false);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };
  const browseAll = () => { setShowFavorites(false); setQuery(''); setCategory('All'); };
  const visibleCourses = showFavorites ? courses.filter(course => saved.includes(course.id)) : courses;
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return <div className="storefront">
    <header className="site-header">
      <a className="brand" href="#top"><span className="brand-mark"><GraduationCap size={20}/></span>learnloop<span className="brand-period">.</span></a>
      <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}><a className={!showFavorites ? 'nav-current' : ''} href="#catalog" onClick={() => {setShowFavorites(false);setMenuOpen(false);}}>Explore</a><button className={showFavorites ? 'nav-current' : ''} onClick={openFavorites}><Heart size={15}/> Saved <span>{saved.length}</span></button><a href="#about" onClick={() => setMenuOpen(false)}>About</a></nav>
      <div className="header-right"><span className="redis-live"><i/> REDIS LIVE</span><div className="header-user">LM</div></div>
    </header>

    <main id="top">
      <section className="hero-band"><div className="hero-content"><div className="hero-date"><span/> {date.toUpperCase()}</div><div className="hero-overline">A LITTLE CURIOSITY GOES A LONG WAY</div><h1>Learn something<br/><em>that moves you.</em></h1><p>Thoughtful courses for curious minds. Find a new skill, follow an idea, see where it takes you.</p><a className="hero-button" href="#catalog">Find your next course <ArrowRight size={17}/></a><div className="hero-proof"><div className="proof-avatars"><span>MI</span><span>AP</span><span>ED</span><span>+2k</span></div><div><b>Made for the curious</b><small>Join learners building what’s next</small></div></div></div><div className="hero-art" aria-hidden="true"><div className="art-sun"/><div className="art-loop loop-one"/><div className="art-loop loop-two"/><div className="art-shape shape-orange"/><div className="art-shape shape-lilac"/><div className="art-shape shape-green"/><div className="art-cross">✳</div><div className="art-caption"><Sparkles size={14}/> IDEAS IN MOTION</div></div><div className="hero-side-note">01 <span>—</span> 04</div></section>

      <section className="quick-facts"><div><BookOpen size={17}/><b>06</b><span>handpicked courses</span></div><i/><div><Users size={17}/><b>7.4k</b><span>curious learners</span></div><i/><div><Star size={17} fill="currentColor"/><b>4.9</b><span>average rating</span></div><div className="cache-fact"><Zap size={16}/><span>Redis response</span><b>{result?.latency_ms ?? '—'} ms</b><label className={result?.cache === 'HIT' ? 'cache-hit' : ''}>{result?.cache || 'READY'}</label></div></section>

      <section className="catalog-section" id="catalog"><div className="catalog-top"><div><div className="section-kicker">THE LEARNING EDIT</div><h2>{showFavorites ? 'Your saved courses' : 'Find your next thing.'}<span>✳</span></h2><p>{showFavorites ? 'A collection of ideas you want to come back to.' : 'Good ideas start with a good place to look.'}</p></div><button className="all-courses" onClick={browseAll}>Browse all <ArrowRight size={15}/></button></div>
        <div className="catalog-tools"><form className="search-bar" onSubmit={event => {event.preventDefault();setShowFavorites(false);loadCourses(query, category);}}><Search size={18}/><input value={query} onChange={event => {setQuery(event.target.value);setShowFavorites(false);}} placeholder="Search a topic, skill, or teacher" aria-label="Search courses"/><kbd>⌘ K</kbd></form><span className="tool-divider"/><div className="filter-tabs">{categories.map(name => {const Icon = categoryIcons[name];return <button key={name} className={category === name && !showFavorites ? 'selected' : ''} onClick={() => {setShowFavorites(false);setCategory(name);}}>{Icon && <Icon size={14}/>}{name}</button>;})}</div><div className="result-count">{showFavorites ? visibleCourses.length : courses.length} {showFavorites ? 'saved' : 'courses'}</div></div>

        <div className="course-grid">{loading ? <div className="loading"><span/> Loading the good stuff...</div> : visibleCourses.length ? visibleCourses.map((course, index) => <article className={`course-card ${course.category === 'Design' ? 'design-card' : course.category === 'Development' ? 'dev-card' : 'data-card'}`} key={course.id} style={{'--index': index}}>
          <div className="course-visual"><div className="visual-index">0{index + 1}</div><span className="visual-category">{course.category}</span><button className={`save-course ${saved.includes(course.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(course.id)} aria-label={saved.includes(course.id) ? 'Remove from favorites' : 'Save course'}><Heart size={17} fill={saved.includes(course.id) ? 'currentColor' : 'none'}/></button>{course.category === 'Design' ? <div className="design-visual"><div className="design-slab slab-one"/><div className="design-slab slab-two"/><div className="design-slab slab-three"/><span>✳</span></div> : course.category === 'Development' ? <div className="dev-visual"><div className="terminal"><div><i/><i/><i/></div><b><span>01</span> &lt;build /&gt;</b><b><span>02</span> with curiosity</b><b><span>03</span> and good coffee_</b></div><span className="bracket">{ }</span></div> : <div className="data-visual"><div className="data-orbit orbit-a"/><div className="data-orbit orbit-b"/><div className="data-core">✳</div><i className="data-node node-one"/><i className="data-node node-two"/></div>}{course.popular && <span className="popular-label"><Flame size={12} fill="currentColor"/> MOST LOVED</span>}</div>
          <div className="course-info"><div className="course-meta"><span>{course.level}</span><i/> <span><Clock3 size={13}/>{course.duration} weeks</span><span className="rating"><Star size={13} fill="currentColor"/>{course.rating}</span></div><h3>{course.title}</h3><p>{course.description}</p><div className="course-bottom"><div className="instructor"><span>{initials(course.instructor)}</span><div><small>YOUR INSTRUCTOR</small><b>{course.instructor}</b></div></div><b className="price">{course.price}<small> RON</small></b></div><button className="course-link" onClick={() => setSelected(course)}>Explore course <ArrowRight size={15}/></button></div>
        </article>) : <div className="empty-state"><div><Search size={22}/></div><h3>{showFavorites ? 'Your collection is waiting.' : 'Nothing here just yet.'}</h3><p>{showFavorites ? 'Tap the heart on any course to save it for later.' : 'Try another search or explore a different category.'}</p><button onClick={browseAll}>Explore all courses <ArrowRight size={15}/></button></div>}</div>
      </section>

      <section className="redis-panel" id="about"><div className="redis-icon"><Database size={19}/></div><div className="redis-description"><span>UNDER THE HOOD</span><b>Fast feels good.</b><p>Redis keeps recent searches close by, so the next visit is instant.</p></div><div className="redis-metric"><span>LAST RESPONSE</span><b>{result?.latency_ms ?? '—'} <small>ms</small></b></div><div className="redis-state"><span className={result?.cache === 'HIT' ? 'cache-hit' : ''}><i/>{result?.cache || 'READY'}</span><small>60 second cache</small></div><button onClick={clearCache}>Clear cache <ArrowRight size={15}/></button></section>
      <footer className="site-footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><GraduationCap size={17}/></span>learnloop<span className="brand-period">.</span></a><span>© 2026 Learnloop</span><span>Made for the curious <span className="footer-star">✳</span></span><button onClick={() => setNotice('React + Vite · FastAPI · PostgreSQL · Redis')}>Built with care</button></footer>
    </main>

    {notice && <div className="toast"><span><Check size={14}/></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="course-modal" onClick={event => event.stopPropagation()}><button className="modal-x" onClick={() => setSelected(null)} aria-label="Close"><X size={18}/></button><span className="modal-tag">{selected.category}</span><h2>{selected.title}</h2><p>{selected.description}</p><div className="modal-stats"><span><Clock3 size={16}/>{selected.duration} weeks</span><span><Star size={16} fill="currentColor"/>{selected.rating} rating</span><span><Users size={16}/>{selected.students.toLocaleString('en-US')} learners</span></div><div className="modal-teacher"><span>{initials(selected.instructor)}</span>With <b>{selected.instructor}</b></div><div className="modal-footer"><b>{selected.price} <small>RON</small></b><button onClick={() => {setSelected(null);setNotice('You are enrolled. Happy learning!');}}>Enroll now <ArrowRight size={16}/></button></div></section></div>}
  </div>;
}
