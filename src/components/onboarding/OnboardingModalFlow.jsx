import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { onboardingApi, authApi } from '../../services/api';
import telemetry from '../../services/telemetry';
import {
  Globe,
  TrendingUp,
  Cpu,
  Leaf,
  Trophy,
  Gamepad2,
  Coffee,
  Dumbbell,
  Scissors,
  Compass,
  GraduationCap,
  Palette,
  Search,
  Check,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  ArrowRight,
  Loader2,
  RotateCcw,
  Sliders,
  ChevronDown,
  Plus,
} from 'lucide-react';

// 12 Circular Feed Categories mapped to Lucide Icons (4 rows x 3 columns)
export const FEED_CATEGORIES = [
  // Row 1
  { id: 'news_politics', label: 'News & Politics', icon: Globe, color: '#2563eb' },
  { id: 'business_finance', label: 'Business & Finance', icon: TrendingUp, color: '#008751' },
  { id: 'technology', label: 'Technology', icon: Cpu, color: '#7c3aed' },

  // Row 2
  { id: 'science_environment', label: 'Science & Nature', icon: Leaf, color: '#059669' },
  { id: 'sports', label: 'Sports', icon: Trophy, color: '#ea580c' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, color: '#dc2626' },

  // Row 3
  { id: 'culture_lifestyle', label: 'Culture & Life', icon: Coffee, color: '#d97706' },
  { id: 'health_fitness', label: 'Health & Fitness', icon: Dumbbell, color: '#0284c7' },
  { id: 'fashion_beauty', label: 'Fashion & Style', icon: Scissors, color: '#db2777' },

  // Row 4
  { id: 'travel_outdoors', label: 'Travel & Outdoors', icon: Compass, color: '#0891b2' },
  { id: 'education_careers', label: 'Careers & Study', icon: GraduationCap, color: '#4f46e5' },
  { id: 'art_design', label: 'Art & Design', icon: Palette, color: '#9333ea' },
];

// Fallback all-inclusive interests list directly from prompt
export const ALL_INTERESTS_RAW = [
  "Political Humor", "Stock Market", "Men's Grooming", "Artificial Intelligence", "Scam Alerts",
  "Smartphones", "GTA", "PlayStation", "Vacation Planning", "Side Hustles", "Call of Duty: Mobile",
  "Immigration & Visas", "Soccer", "Makeup", "Strength Training", "Skincare & K-Beauty",
  "Cryptocurrency", "Political Theory", "Character Design", "Studying Abroad", "Investing",
  "Software Development", "Fighting Games", "Web Design & Development", "Travel Deals",
  "Digital Art & Illustration", "Cybersecurity", "Bodybuilding", "Men's Fashion",
  "Computer Science & AI", "Voting Rights", "International Soccer", "Power Outages & Utilities",
  "University & College Admissions", "Workplace Rights & Culture", "Call of Duty Zombies",
  "Budgeting & Personal Finance", "Day Trading", "Air Travel", "Public Health", "Soccer Video Games",
  "Anime Art & Illustration", "Mobile Payments & Banking", "Assassin's Creed", "Floods & Natural Disasters",
  "Algorithmic Trading", "Programming", "Perfumes & Fragrances", "Racing Games", "Semiconductor Stocks",
  "Home Workouts & Calisthenics", "Travel Hacking & Miles", "US Immigration & Visas", "Android Customization",
  "Banking & Investment Apps", "Streetwear & Sneakers", "Beach Vacations", "Red Dead Redemption",
  "IT Certifications", "Hairstyles & Haircuts", "AI Stocks", "CoD: Black Ops", "Fantasy Premier League",
  "Bath & Body Works", "Gym Motivation", "FIFA World Cup", "Travel Rewards", "Sleep Hygiene",
  "Sketching & Drawing", "Art Commissions", "Clash of Clans", "NBA", "Painting", "Open World RPGs",
  "Productivity", "Exam Prep & Studying", "Fortnite Battle Royale", "Tech Careers", "Digital Advertising",
  "MMA & UFC", "Clash Royale", "Outfit Inspiration", "Digital Art", "PC Building & Troubleshooting",
  "Celebrity Fashion & Style", "Hiking & Backpacking", "Pro Wrestling", "International Money Transfer",
  "CPA & CFA Exams", "Campus Life", "Engineering Placements", "Workout Supplements", "Public Transit",
  "Climate & Sustainability", "Street Art & Graffiti", "Personal Loans", "SAT & ACT Prep",
  "Dark Fantasy Art", "Referral Programs", "AI & SEO", "Mortal Kombat", "Remote & Freelance Jobs",
  "Fine Art", "Cruises", "Thrifting & Vintage", "Referral Codes & Rewards", "VPNs & Online Privacy",
  "Financial Independence", "Meditation & Mindfulness", "Spa & Wellness", "NBA 2K", "Hair Care",
  "Credit Cards", "Role-Playing Games", "Fishing", "Deals & Promo Codes", "Formula 1",
  "Generational Culture", "Kayaking & Paddleboarding", "Running", "Anime & Manga", "Elden Ring",
  "Ancient History & Mythology", "Rock Climbing & Bouldering", "Retirement Planning", "Dating Advice",
  "Relationship Advice", "Law Careers", "Extreme Weather", "Martial Arts", "Pixel Art Game Dev",
  "Prayer & Faith", "Breakups & Heartbreak", "Wedding Planning", "Tennis", "Resident Evil",
  "Athleisure & Activewear", "Casual Chat", "Swimming", "Art Galleries & Museums", "E-commerce Selling",
  "Civil Engineering", "Deals & Coupons", "Student Loans & Aid", "Cartography & Flags",
  "Cartoons & Animation", "Olympic Sports", "Pre-Med & Medical School", "Home Buying & Mortgages",
  "Law School & Bar Exam", "Digital Minimalism", "Cashback & Coupons", "Wedding Photography",
  "UI/UX Design", "Competitive Exams", "Racket Sports", "NFL", "Fantasy Football", "Music Production",
  "Cybersecurity & Online Safety", "Delivery Drivers", "Mythical Creature Art", "Shipping & Logistics",
  "Lost and Found", "Cricket", "Macroeconomics & Interest Rates", "Software Testing & QA", "WNBA",
  "Astronomy", "Rocket League", "Indie Game Development", "Economic Inequality", "Urban Photography",
  "AI Video Generation", "Severe Weather & Storms", "Philosophy", "Income Tax",
  "Wedding & Bridal Fashion", "Copyright & Intellectual Property", "Package Tracking & Delivery",
  "Pixel Art", "Online Surveys", "Gemini AI", "Swimwear", "Manifestation & Law of Attraction",
  "Dragon Ball Games", "Clothing Resale", "Wildfires", "NCLEX & Nursing School", "Restaurant Business",
  "Physics", "Refunds & Returns", "Dragon Ball", "MCAT & USMLE Prep", "Battlefield",
  "Family Dynamics", "Golf", "Hair Coloring", "Gaming Subscriptions", "Landscape Photography",
  "Friendship Dynamics", "Budget & Used Laptops", "Esports", "Love & Romance", "Vintage Photography",
  "Spider-Man", "Cosplay & Costuming", "Smartphone Battery Life", "Pokémon Fan Art", "App Development",
  "AI Software Development", "Data Science & Statistics", "Android ROMs & Rooting",
  "Online Account Security", "Goth Fashion", "Large Language Models", "Teaching", "Phone Accessories",
  "Linguistics", "MLB", "Sneakers", "Cycling", "Wills & Estate Planning", "Shadow Fight", "Earthquakes",
  "Jujutsu Kaisen", "Manhwa", "College Football", "RPG Character Art", "Halloween", "Water Conservation",
  "Madden & College Football", "Dating Apps", "Spider-Man Games", "Service Industry",
  "Bollywood Fashion", "Cosplay Props & Armor", "Naval History", "Watch Collecting", "Indian Fashion"
];

// Levenshtein distance algorithm for typo tolerance
function levenshteinDistance(s1, s2) {
  s1 = (s1 || '').toLowerCase();
  s2 = (s2 || '').toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Synonyms and acronym expansions for instant closeness
const TOPIC_SYNONYMS = {
  ai: ['artificial intelligence', 'large language models', 'computer science & ai', 'ai stocks', 'ai software development', 'ai video generation', 'gemini ai'],
  artificial: ['artificial intelligence'],
  crypto: ['cryptocurrency', 'day trading', 'investing'],
  btc: ['cryptocurrency', 'day trading', 'investing'],
  bitcoin: ['cryptocurrency', 'day trading', 'investing'],
  stock: ['stock market', 'semiconductor stocks', 'ai stocks', 'investing', 'day trading'],
  stocks: ['stock market', 'semiconductor stocks', 'ai stocks', 'investing', 'day trading'],
  cod: ['call of duty: mobile', 'cod: black ops', 'call of duty zombies'],
  gta: ['gta', 'open world rpgs', 'racing games', 'red dead redemption'],
  gym: ['gym motivation', 'strength training', 'bodybuilding', 'home workouts & calisthenics', 'workout supplements'],
  fitness: ['strength training', 'gym motivation', 'bodybuilding', 'running', 'swimming', 'cycling'],
  workout: ['home workouts & calisthenics', 'strength training', 'bodybuilding', 'gym motivation', 'workout supplements'],
  money: ['investing', 'stock market', 'budgeting & personal finance', 'financial independence', 'personal loans', 'credit cards', 'side hustles'],
  finance: ['budgeting & personal finance', 'financial independence', 'stock market', 'investing', 'day trading', 'banking & investment apps'],
  tech: ['software development', 'computer science & ai', 'web design & development', 'app development', 'ai software development', 'cybersecurity'],
  coding: ['programming', 'software development', 'web design & development', 'app development'],
  dev: ['software development', 'web design & development', 'app development', 'indie game development', 'pixel art game dev'],
  developer: ['software development', 'web design & development', 'app development', 'indie game development'],
  soccer: ['soccer', 'international soccer', 'fantasy premier league', 'fifa world cup', 'soccer video games'],
  football: ['soccer', 'international soccer', 'fifa world cup', 'nfl', 'fantasy football', 'college football'],
  fashion: ["men's fashion", 'streetwear & sneakers', 'outfit inspiration', 'vintage photography', 'celebrity fashion & style', 'thrifting & vintage', 'bollywood fashion'],
  skin: ['skincare & k-beauty', 'hair care', 'spa & wellness'],
  skincare: ['skincare & k-beauty', 'hair care', 'spa & wellness'],
  travel: ['vacation planning', 'travel deals', 'travel hacking & miles', 'air travel', 'beach vacations', 'travel rewards', 'hiking & backpacking'],
  flight: ['air travel', 'travel deals', 'vacation planning'],
  visa: ['immigration & visas', 'us immigration & visas', 'studying abroad'],
  visas: ['immigration & visas', 'us immigration & visas', 'studying abroad'],
  immigration: ['immigration & visas', 'us immigration & visas', 'studying abroad'],
  game: ['fighting games', 'racing games', 'open world rpgs', 'indie game development', 'playstation', 'gta'],
  gaming: ['fighting games', 'racing games', 'open world rpgs', 'indie game development', 'playstation', 'gta'],
  f1: ['formula 1', 'racing games'],
};

// Calculates closeness score for ranking search candidates
function computeClosenessScore(topic, query) {
  const t = topic.toLowerCase();
  const q = query.toLowerCase().trim();

  // 1. Exact match
  if (t === q) return { score: 100, matchType: 'Exact Match' };

  // 2. Starts with query
  if (t.startsWith(q)) return { score: 92, matchType: 'Best Match' };

  // 3. Word boundary exact or startsWith (e.g. "intelligence" in "Artificial Intelligence")
  const words = t.split(/[\s&/\\-]+/);
  for (const w of words) {
    if (w === q) return { score: 88, matchType: 'Direct Match' };
    if (w.startsWith(q)) return { score: 82, matchType: 'Closest Match' };
  }

  // 4. Substring contains
  if (t.includes(q)) return { score: 75, matchType: 'Contains Match' };

  // 5. Acronym / Synonym Mapping
  const synonyms = TOPIC_SYNONYMS[q];
  if (synonyms) {
    for (const syn of synonyms) {
      if (t === syn || t.includes(syn) || syn.includes(t)) {
        return { score: 79, matchType: 'Related Topic' };
      }
    }
  }

  // 6. Typo edit-distance (Levenshtein)
  if (q.length >= 3) {
    const dist = levenshteinDistance(q, t);
    const maxLen = Math.max(q.length, t.length);
    const ratio = 1 - (dist / maxLen);
    if (ratio >= 0.65) {
      return { score: Math.round(ratio * 74), matchType: 'Closest Match' };
    }

    // Compare with individual words in topic
    for (const w of words) {
      if (w.length >= 3) {
        const wDist = levenshteinDistance(q, w);
        const wMax = Math.max(q.length, w.length);
        const wRatio = 1 - (wDist / wMax);
        if (wRatio >= 0.70) {
          return { score: Math.round(wRatio * 71), matchType: 'Closest Match' };
        }
      }
    }
  }

  return { score: 0, matchType: null };
}

export const OnboardingModalFlow = () => {
  const { user, updateUser, showAlert } = useAuth();

  // Determine current step based on user onboarding status
  const [currentStep, setCurrentStep] = useState(() => {
    if (!user) return null;
    if (user.onboardingCompleted) return null;
    if (user.authProvider === 'google' && (!user.username || user.usernameAutoGenerated || user.onboardingStep === 'username')) {
      return 'username';
    }
    if (user.onboardingStep === 'interests') {
      return 'interests';
    }
    return 'feed';
  });

  const [stepStartTime, setStepStartTime] = useState(Date.now());

  // Reset timer on step change
  useEffect(() => {
    setStepStartTime(Date.now());
  }, [currentStep]);

  // Update step if user changes
  useEffect(() => {
    if (!user || user.onboardingCompleted) {
      setCurrentStep(null);
      return;
    }
    if (user.authProvider === 'google' && (!user.username || user.usernameAutoGenerated || user.onboardingStep === 'username')) {
      setCurrentStep('username');
    } else if (user.onboardingStep === 'interests') {
      setCurrentStep('interests');
    } else {
      setCurrentStep('feed');
    }
  }, [user?.onboardingCompleted, user?.onboardingStep, user?.authProvider]);

  // ---------------- STEP 1: USERNAME STATE ----------------
  const [chosenUsername, setChosenUsername] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    checked: false,
    available: null,
    message: '',
  });
  const [suggestions, setSuggestions] = useState([]);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);
  const debounceRef = useRef(null);

  // Load suggestions on mount if in username step
  useEffect(() => {
    if (currentStep === 'username' && user) {
      onboardingApi
        .getUsernameSuggestions(user.id || user._id)
        .then((res) => {
          if (Array.isArray(res?.suggestions)) {
            setSuggestions(res.suggestions);
          }
        })
        .catch(() => {});
    }
  }, [currentStep, user]);

  // Real-time username validation
  useEffect(() => {
    const raw = chosenUsername.trim().replace(/^@/, '');
    if (!raw) {
      setUsernameStatus({ checking: false, checked: false, available: null, message: '' });
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(raw)) {
      setUsernameStatus({
        checking: false,
        checked: true,
        available: false,
        message: 'Letters and numbers only. No special characters.',
      });
      return;
    }

    if (raw.length < 3) {
      setUsernameStatus({
        checking: false,
        checked: true,
        available: false,
        message: 'Must be at least 3 characters',
      });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, checking: true }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authApi.checkUsername(raw);
        setUsernameStatus({
          checking: false,
          checked: true,
          available: res.available,
          message: res.message || (res.available ? 'Username is available' : 'Username is taken'),
        });
      } catch (_) {
        setUsernameStatus({
          checking: false,
          checked: true,
          available: false,
          message: 'Error verifying username',
        });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [chosenUsername]);

  const handleConfirmUsername = async (skip = false) => {
    setIsSubmittingUsername(true);
    const durationMs = Date.now() - stepStartTime;
    try {
      const cleanUsername = chosenUsername.trim().replace(/^@/, '');
      const res = await onboardingApi.setUsername({
        userId: user?.id || user?._id,
        username: cleanUsername,
        skip,
        source: 'typed',
        durationMs,
      });

      if (res?.success && res?.user) {
        updateUser(res.user);
        telemetry.track('onboarding_username_set', {
          skip,
          username: res.user.username,
        });
        setCurrentStep('feed');
      } else {
        showAlert(res?.message || 'Could not update username. Please try again.', 'error');
      }
    } catch (err) {
      showAlert(err.message || 'Failed to set username', 'error');
    } finally {
      setIsSubmittingUsername(false);
    }
  };

  // ---------------- STEP 2: FEED CUSTOMIZATION STATE (12 CIRCLES) ----------------
  const [selectedCategories, setSelectedCategories] = useState(user?.feedCategories || []);
  const [isSubmittingFeed, setIsSubmittingFeed] = useState(false);

  const toggleCategory = (categoryId) => {
    const isPicking = !selectedCategories.includes(categoryId);
    const updatedCategories = isPicking
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId);

    setSelectedCategories(updatedCategories);

    // Save in REAL TIME and train ML behavioral patterns immediately on every pick/unpick
    const durationMs = Date.now() - stepStartTime;
    onboardingApi
      .toggleDesk({
        userId: user?.id || user?._id,
        categoryId,
        action: isPicking ? 'pick' : 'unpick',
        categories: updatedCategories,
        durationMs,
      })
      .then((res) => {
        if (res?.user) {
          updateUser(res.user);
        }
      })
      .catch((err) => {
        console.warn('Real-time desk sync:', err.message);
      });
  };

  const handleConfirmFeed = async () => {
    let catsToSave = selectedCategories;
    if (catsToSave.length === 0) {
      catsToSave = FEED_CATEGORIES.map((c) => c.id);
      setSelectedCategories(catsToSave);
    }

    setIsSubmittingFeed(true);
    const durationMs = Date.now() - stepStartTime;
    try {
      const res = await onboardingApi.saveFeed({
        userId: user?.id || user?._id,
        categories: catsToSave,
        durationMs,
      });

      if (res?.success && res?.user) {
        updateUser(res.user);
        telemetry.track('onboarding_feed_saved', {
          count: selectedCategories.length,
          categories: selectedCategories,
        });
        setCurrentStep('interests');
      } else {
        showAlert(res?.message || 'Failed to save feed preferences.', 'error');
      }
    } catch (err) {
      showAlert(err.message || 'Failed to save feed preferences.', 'error');
    } finally {
      setIsSubmittingFeed(false);
    }
  };

  // ---------------- STEP 3: INTERESTS STATE ----------------
  const [dbCatalogTopics, setDbCatalogTopics] = useState([]);
  const [interestSearchQuery, setInterestSearchQuery] = useState('');
  const [selectedInterests, setSelectedInterests] = useState(user?.interests || []);
  const [customInterests, setCustomInterests] = useState([]);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [isSubmittingInterests, setIsSubmittingInterests] = useState(false);
  const [searchedQueriesList, setSearchedQueriesList] = useState([]);

  // Load real topics from MongoDB collection: interest_topics
  useEffect(() => {
    onboardingApi
      .getCatalog()
      .then((res) => {
        if (Array.isArray(res?.topics) && res.topics.length > 0) {
          const names = res.topics.map((t) => (typeof t === 'string' ? t : t.name));
          setDbCatalogTopics(names);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch topics catalog from database:', err);
      });
  }, []);

  // Track search terms in modal
  const handleInterestSearchChange = (val) => {
    setInterestSearchQuery(val);
    const trimmed = val.trim();
    if (trimmed.length >= 3 && !searchedQueriesList.includes(trimmed)) {
      setSearchedQueriesList((prev) => [...prev.slice(-15), trimmed]);
    }
  };

  const toggleInterest = (topic) => {
    setSelectedInterests((prev) => {
      const exists = prev.includes(topic);
      if (exists) {
        return prev.filter((t) => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Add custom interest when user presses Enter
  const handleAddCustomInterest = (customName) => {
    const trimmed = (customName || interestSearchQuery).trim();
    if (!trimmed) return;
    if (!selectedInterests.includes(trimmed)) {
      setSelectedInterests((prev) => [...prev, trimmed]);
      setCustomInterests((prev) => [...prev, trimmed]);
    }
    setInterestSearchQuery('');
  };

  // Closest search matches ranked by relevance score
  const closestMatches = useMemo(() => {
    const q = interestSearchQuery.trim();
    if (!q) return [];

    const list = dbCatalogTopics.length > 0 ? dbCatalogTopics : ALL_INTERESTS_RAW;
    const scored = [];

    for (const topic of list) {
      const { score, matchType } = computeClosenessScore(topic, q);
      if (score > 0) {
        scored.push({ topic, score, matchType });
      }
    }

    // Sort descending by closeness score
    scored.sort((a, b) => b.score - a.score);

    // Limit to top 25 closest results
    return scored.slice(0, 25);
  }, [dbCatalogTopics, interestSearchQuery]);

  // Initial curated batch when not searching
  const initialCuratedTopics = useMemo(() => {
    const list = dbCatalogTopics.length > 0 ? dbCatalogTopics : ALL_INTERESTS_RAW;
    if (!showAllTopics) {
      return list.slice(0, 48);
    }
    return list;
  }, [dbCatalogTopics, showAllTopics]);

  const handleFinishOnboarding = async () => {
    if (selectedInterests.length < 3) {
      showAlert(`Please choose at least 3 topics to tailor your feed (${selectedInterests.length}/3 selected).`, 'error');
      return;
    }

    setIsSubmittingInterests(true);
    const durationMs = Date.now() - stepStartTime;
    try {
      // Map names to slugs
      const slugs = selectedInterests.map((name) =>
        name
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );

      const res = await onboardingApi.saveInterests({
        userId: user?.id || user?._id,
        interests: slugs,
        customInterests,
        searchQueries: searchedQueriesList,
        durationMs,
      });

      if (res?.success && res?.user) {
        updateUser(res.user);
        telemetry.track('onboarding_completed', {
          totalInterests: selectedInterests.length,
          interests: selectedInterests,
          categories: selectedCategories,
        });
        showAlert('Setup complete! Welcome to your personalized NewsCuddle feed.', 'success');
        setCurrentStep(null);
      } else {
        showAlert(res?.message || 'Failed to complete setup.', 'error');
      }
    } catch (err) {
      showAlert(err.message || 'Failed to complete setup.', 'error');
    } finally {
      setIsSubmittingInterests(false);
    }
  };

  if (!currentStep) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal-container">
        {/* ================= STEP 1: USERNAME SELECTION (FOR GOOGLE SIGNUPS) ================= */}
        {currentStep === 'username' && (
          <div className="onboarding-card username-step-card animate-fade-in">
            <div className="onboarding-header">
              <h2 className="onboarding-main-title">Choose your username</h2>
              <p className="onboarding-sub-title">
                This will be your unique institutional handle across NewsCuddle desks and discussions.
              </p>
            </div>

            <div className="username-input-section">
              <label className="onboarding-field-label">USERNAME</label>
              <div className="onboarding-input-wrapper">
                <span className="onboarding-input-prefix">@</span>
                <input
                  type="text"
                  className={`onboarding-input ${
                    usernameStatus.checked && !usernameStatus.checking
                      ? usernameStatus.available
                        ? 'is-valid'
                        : 'is-invalid'
                      : ''
                  }`}
                  placeholder="adelekepaul"
                  value={chosenUsername}
                  onChange={(e) => setChosenUsername(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                <div className="onboarding-input-status">
                  {usernameStatus.checking && (
                    <Loader2 size={16} className="spin-animation" color="#008751" />
                  )}
                  {!usernameStatus.checking && usernameStatus.checked && (
                    usernameStatus.available ? (
                      <CheckCircle2 size={18} color="#008751" />
                    ) : (
                      <XCircle size={18} color="#dc2626" />
                    )
                  )}
                </div>
              </div>

              {/* Status helper text */}
              {usernameStatus.message && (
                <div
                  className={`username-feedback ${
                    usernameStatus.available ? 'feedback-success' : 'feedback-error'
                  }`}
                >
                  <span>{usernameStatus.message}</span>
                </div>
              )}
            </div>

            {/* Suggestions Chips */}
            {suggestions.length > 0 && (
              <div className="suggestions-section">
                <span className="suggestions-label">Suggestions based on your profile:</span>
                <div className="suggestions-chips-row">
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="suggestion-chip-btn"
                      onClick={() => setChosenUsername(sug)}
                    >
                      <span>@{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons: Confirm or Skip */}
            <div className="onboarding-actions-row">
              <button
                type="button"
                className="onboarding-skip-btn"
                onClick={() => handleConfirmUsername(true)}
                disabled={isSubmittingUsername}
                title="Use auto-generated handle and continue"
              >
                Skip for now
              </button>

              <button
                type="button"
                className="onboarding-next-btn btn-primary"
                onClick={() => handleConfirmUsername(false)}
                disabled={isSubmittingUsername || (chosenUsername.trim().length > 0 && usernameStatus.available === false)}
              >
                {isSubmittingUsername ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Setting username...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Username</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: FEED CUSTOMIZATION (12 CIRCLES IN 4 ROWS x 3 COLUMNS) ================= */}
        {currentStep === 'feed' && (
          <div className="onboarding-card feed-step-card animate-fade-in">
            <div className="onboarding-header text-center">
              <h2 className="onboarding-main-title">Customize your feed</h2>
              <p className="onboarding-sub-title">
                Select the editorial desks you wish to prioritize on your primary intelligence terminal.
              </p>
            </div>

            {/* 12 Circular Items in a 4-Row x 3-Column Grid */}
            <div className="feed-circles-grid-4x3">
              {FEED_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className={`feed-circle-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="circle-node-wrapper">
                      <div className="circle-node">
                        <IconComponent size={24} className="circle-node-icon" />
                        {isSelected && (
                          <div className="circle-check-badge">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="circle-node-label">{cat.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Selected Count Indicator */}
            <div className="feed-selection-indicator">
              <span className="selection-counter-text">
                <strong>{selectedCategories.length}</strong> of 12 desks selected {selectedCategories.length < 3 ? `(choose at least 3 to continue)` : ''}
              </span>
            </div>

            {/* Action Bar with equal sized buttons */}
            <div className="onboarding-actions-row">
              <button
                type="button"
                className="feed-select-all-btn"
                onClick={() => {
                  const isSelectAll = selectedCategories.length !== FEED_CATEGORIES.length;
                  const newCats = isSelectAll ? FEED_CATEGORIES.map((c) => c.id) : [];
                  setSelectedCategories(newCats);

                  // Real-time sync and ML learning for bulk select / clear
                  const durationMs = Date.now() - stepStartTime;
                  onboardingApi
                    .toggleDesk({
                      userId: user?.id || user?._id,
                      categoryId: 'all',
                      action: isSelectAll ? 'bulk_select' : 'bulk_clear',
                      categories: newCats,
                      durationMs,
                    })
                    .then((res) => {
                      if (res?.user) {
                        updateUser(res.user);
                      }
                    })
                    .catch(() => {});
                }}
              >
                {selectedCategories.length === FEED_CATEGORIES.length ? 'Clear Selection' : 'Select All 12 Desks'}
              </button>

              <button
                type="button"
                className="onboarding-next-btn btn-primary"
                onClick={handleConfirmFeed}
                disabled={isSubmittingFeed || selectedCategories.length < 3}
                id="btn-continue-feed"
              >
                {isSubmittingFeed ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Saving Desks...</span>
                  </>
                ) : (
                  <>
                    <span>{selectedCategories.length < 3 ? `Choose 3 to Continue (${selectedCategories.length}/3)` : 'Continue'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: FEED INTERESTS (SEARCH & TOPIC CHIPS) ================= */}
        {currentStep === 'interests' && (
          <div className="onboarding-card interests-step-card animate-fade-in">
            <div className="onboarding-header">
              <h2 className="onboarding-main-title">Select your feed interests</h2>
            </div>

            {/* Interactive Search Bar inside the Modal */}
            <div className="interests-search-wrapper">
              <Search size={16} className="interests-search-icon" />
              <input
                type="text"
                className="interests-search-input"
                placeholder="Search topics (e.g. AI, GTA, Stock Market, Skincare, Crypto...)"
                value={interestSearchQuery}
                onChange={(e) => handleInterestSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && interestSearchQuery.trim()) {
                    handleAddCustomInterest(interestSearchQuery.trim());
                  }
                }}
              />
              {interestSearchQuery && (
                <button
                  type="button"
                  className="interests-search-clear"
                  onClick={() => setInterestSearchQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Counter Bar */}
            <div className="interests-status-bar">
              <span className="interests-count-pill">
                {selectedInterests.length >= 3 ? (
                  <span className="count-met">
                    <Check size={13} /> {selectedInterests.length} topics selected
                  </span>
                ) : (
                  <span className="count-unmet">
                    {selectedInterests.length} of 3 minimum selected
                  </span>
                )}
              </span>

              {/* Reset selections button */}
              {selectedInterests.length > 0 && (
                <button
                  type="button"
                  className="interests-reset-link"
                  onClick={() => setSelectedInterests([])}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* If searching: Bring out interactive list of the closest matches inside the modal */}
            {interestSearchQuery.trim() ? (
              <div className="closest-matches-container custom-scrollbar">
                <div className="closest-matches-header">
                  <span>Closest matches for "{interestSearchQuery.trim()}"</span>
                  <span>{closestMatches.length} found</span>
                </div>

                {closestMatches.length > 0 ? (
                  closestMatches.map(({ topic, matchType }) => {
                    const isSelected = selectedInterests.includes(topic);
                    return (
                      <div
                        key={topic}
                        className={`closest-match-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleInterest(topic)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="closest-match-info">
                          <span className="closest-match-name">{topic}</span>
                          {matchType && (
                            <span className={`closest-match-badge ${matchType === 'Exact Match' || matchType === 'Best Match' ? 'best' : ''}`}>
                              {matchType}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className={`closest-match-action-btn ${isSelected ? 'is-selected' : 'not-selected'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleInterest(topic);
                          }}
                        >
                          {isSelected ? (
                            <>
                              <Check size={12} strokeWidth={3} />
                              <span>Selected</span>
                            </>
                          ) : (
                            <>
                              <Plus size={12} />
                              <span>Select</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="interests-empty-search">
                    <p>No catalog topic found matching "{interestSearchQuery}".</p>
                    <button
                      type="button"
                      className="add-custom-interest-btn"
                      onClick={() => handleAddCustomInterest(interestSearchQuery)}
                    >
                      <Plus size={14} />
                      <span>Add "{interestSearchQuery.trim()}" as a custom interest</span>
                    </button>
                  </div>
                )}

                {/* If the exact string wasn't an exact match in the catalog, also allow 1-click addition */}
                {closestMatches.length > 0 && !closestMatches.some((m) => m.topic.toLowerCase() === interestSearchQuery.trim().toLowerCase()) && (
                  <div style={{ marginTop: '0.45rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="add-custom-interest-btn"
                      onClick={() => handleAddCustomInterest(interestSearchQuery)}
                    >
                      <Plus size={13} />
                      <span>Add "{interestSearchQuery.trim()}" as a custom topic</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* If not searching: Display standard chips layout */
              <div className="interests-chips-container custom-scrollbar">
                {initialCuratedTopics.map((topic) => {
                  const isSelected = selectedInterests.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      className={`interest-chip ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => toggleInterest(topic)}
                    >
                      {isSelected && <Check size={12} className="chip-check" />}
                      <span>{topic}</span>
                    </button>
                  );
                })}

                {/* Show More / Less Topics button placed directly after the last shown interest */}
                <button
                  type="button"
                  className="show-more-topics-chip"
                  onClick={() => setShowAllTopics(!showAllTopics)}
                  title={showAllTopics ? 'Show fewer topics' : 'Show more topics from catalog'}
                >
                  <span>{showAllTopics ? 'Show Less Topics' : 'Show More Topics'}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: showAllTopics ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
              </div>
            )}

            {/* Action Row */}
            <div className="onboarding-actions-row">
              <button
                type="button"
                className="onboarding-next-btn btn-primary"
                onClick={handleFinishOnboarding}
                disabled={isSubmittingInterests || selectedInterests.length < 3}
                id="btn-finish-onboarding"
              >
                {isSubmittingInterests ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Configuring Feed...</span>
                  </>
                ) : (
                  <>
                    <span>{selectedInterests.length < 3 ? `Choose 3 to Finish (${selectedInterests.length}/3)` : 'Finish Setup'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModalFlow;
