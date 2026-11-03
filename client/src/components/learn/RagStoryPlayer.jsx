import { useState, useEffect, useRef } from 'react';
import { useVoiceover } from './useVoiceover.js';
import { playRadarPing, playSliceSound, playNeuralPulse, playSuccessChime } from './soundEffects.js';
import './RagStoryPlayer.css';

const SCENES = [
  {
    id: 'problem',
    number: 1,
    title: 'The Problem: Why AI Needs RAG',
    subtitle: 'Without your document, the AI is completely blind',
    emoji: '🤖',
    color: '#ef4444',
    analogy: 'Imagine taking a final exam on a book you have never read. You would have to guess!',
    eli5: 'LLMs like ChatGPT or Llama were trained once on public internet data. They know Shakespeare and math, but they have NEVER seen your private PDF, resume, or company notes. If you ask about your files, the AI will guess or hallucinate wrong facts.',
    keyTakeaway: 'RAG gives the AI an "open-book exam" so it never has to guess.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Pre-trained LLM Weights + Context Window Injection',
    techWhat: 'Large Language Model neural network (8B–70B parameters) with frozen training weights.',
    forWhat: 'Synthesizing fluent, natural language answers from user questions.',
    forWhatDesc: 'The LLM acts as the reasoning engine to comprehend questions and write cohesive explanations.',
    whyUsed: 'Why not fine-tune the model directly?',
    whyUsedDesc: 'Fine-tuning weights on private documents takes hours, costs thousands of dollars in GPU cloud compute, and causes "catastrophic forgetting". RAG injects your private text at inference time with zero retraining cost and zero delay.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 1: The Problem. Why AI needs RAG. Imagine taking a final exam on a book you have never read. You would be forced to guess! Large language models were trained once on public internet data. They have never seen your private resume or company notes. If you ask about your files, the model will hallucinate wrong facts. RAG turns the test into an open-book exam, so the AI never has to guess.',
    voiceScriptDeep: 'Scene 1: The Problem: Why AI needs RAG. Here is what is used, for what it is used, and why. What is used: A pre-trained Large Language Model with frozen neural network weights. For what it is used: Reading questions and synthesizing natural language answers. Why it is used and why it fails alone: Model weights are frozen at training time. They have never seen your private resume or internal files. Fine-tuning a model on private files costs thousands of dollars and causes catastrophic forgetting. RAG completely solves this by retrieving your document facts at query time with zero retraining cost.',
  },
  {
    id: 'chunking',
    number: 2,
    title: 'Chunking: Slicing into Flashcards',
    subtitle: 'Cutting a 20-page document into bite-sized index cards',
    emoji: '✂️',
    color: '#f59e0b',
    analogy: 'Like cutting a huge report into index cards with overlapping edges so no sentence is cut in half.',
    eli5: 'You cannot feed a massive 50-page document into a single AI prompt — it would exceed memory limits and confuse the model. Instead, we slice the text into small "chunks" (e.g. 600 characters). We overlap the edges by 100 characters so critical sentences at the boundaries stay intact.',
    keyTakeaway: 'Small chunks give pinpoint search accuracy; overlap prevents broken sentences.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Sliding Window Chunker (chunkText: 600 chars, 100 overlap)',
    techWhat: 'Deterministic sliding-window text segmentation algorithm.',
    forWhat: 'Segmenting large unstructured text into small, self-contained semantic knowledge units.',
    forWhatDesc: 'Converts a 15,000-character wall of text into approximately 25 to 30 clean chunk objects with character offsets.',
    whyUsed: 'Why 600 characters and why 100-character overlap?',
    whyUsedDesc: 'Embedding models have a strict 512-token limit and cannot embed entire PDFs at once. Furthermore, feeding massive text causes the "Lost in the Middle" retrieval degradation. The 100-character sliding overlap guarantees that any sentence on a boundary line is preserved in full across adjacent chunks.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 2: Chunking. Slicing into flashcards. You cannot feed a 50-page document into a single prompt. It would exceed memory limits and confuse the model. Instead, we slice the text into small chunks of 600 characters. Crucially, we overlap the edges by 100 characters. This sliding overlap ensures that important sentences on the border are never cut in half.',
    voiceScriptDeep: 'Scene 2: Chunking: Slicing into Flashcards. What is used: A sliding-window text chunker using 600-character chunks with a 100-character overlap window. For what it is used: Breaking a long document into atomic semantic cards that can be individually indexed and searched. Why it is used: First, embedding models have a strict 512-token limit. Second, large prompts cause models to suffer from the lost in the middle phenomenon where facts get ignored. Third, the 100-character overlap prevents sentence splitting, guaranteeing boundary sentences are never cut in half.',
  },
  {
    id: 'embedding',
    number: 3,
    title: 'The Meaning Machine: Embeddings',
    subtitle: 'Translating human words into 384 GPS coordinates',
    emoji: '🧠',
    color: '#06b6d4',
    analogy: 'Assigning every sentence a GPS coordinate in thought-space based on its flavor and meaning.',
    eli5: 'Computers cannot calculate the meaning of English words directly. We pass each text chunk through a miniature neural network (all-MiniLM-L6-v2) running inside your browser. It converts the text into 384 numbers. Sentences with similar meanings get numbers right next to each other in space!',
    keyTakeaway: '"Doctor" and "Surgeon" get almost identical numbers. "Pizza" gets completely different numbers.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Transformers.js + Xenova/all-MiniLM-L6-v2 (q8 quantized, 22MB)',
    techWhat: '6-layer Transformer Encoder model running locally in WebAssembly via ONNX Runtime.',
    forWhat: 'Mapping text strings into normalized 384-dimensional dense vectors (Float32Array[384]).',
    forWhatDesc: 'Extracts deep contextual embeddings using multi-head self-attention and mean pooling across all token hidden states.',
    whyUsed: 'Why local MiniLM instead of OpenAI text-embedding-3?',
    whyUsedDesc: 'Local execution is 100% private: your confidential PDF never leaves your device. The quantized INT8 model is only 22 megabytes, runs fast on low-spec CPUs without a GPU, consumes under 150MB RAM, and incurs zero API costs. L2 normalization ensures cosine similarity can be computed via simple dot products.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 3: The Meaning Machine. Generating embeddings. Computers cannot calculate the meaning of words directly. We pass each text chunk through a miniature neural network running right in your browser. It converts the text into 384 numbers. These numbers act like GPS coordinates in thought-space. Words with similar meanings, like doctor and surgeon, get coordinates right next to each other.',
    voiceScriptDeep: 'Scene 3: The Meaning Machine: Generating Embeddings. What is used: Transformers.js running Xenova all-MiniLM-L6-v2 with INT8 quantization inside your browser using WebAssembly. For what it is used: Converting English text into a 384-dimensional vector representing its semantic meaning. Why it is used: It runs 100% locally on your CPU with zero GPU requirement, zero API cost, and total privacy. INT8 quantization compresses the model to just 22 megabytes. Normalizing vectors onto a unit sphere allows similarity to be calculated as an ultra-fast dot product.',
  },
  {
    id: 'galaxy',
    number: 4,
    title: 'The Vector Galaxy: Spatial Index',
    subtitle: 'Arranging knowledge cards on a semantic cosmic map',
    emoji: '🌌',
    color: '#8b5cf6',
    analogy: 'Like books in a magical library floating onto shelves automatically grouped by topic.',
    eli5: 'All chunk vectors are stored in memory. Because similar concepts have similar coordinates, chunks naturally group into clusters: Work Experience chunks gather in one area, Technical Skills gather nearby, and Education chunks gather in another. No manual tagging is required!',
    keyTakeaway: 'Knowledge is organized by meaning, not by alphabetical order or simple keywords.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'In-Memory RAM Store (Array<{ chunkId, text, embedding[384] }>)',
    techWhat: 'Lightweight in-memory flat vector index in JavaScript heap memory.',
    forWhat: 'Fast storage and retrieval pairing chunk vectors with their original text content.',
    forWhatDesc: 'Holds all 30 chunk objects in RAM for instantaneous sub-millisecond similarity scans.',
    whyUsed: 'Why not Pinecone, Milvus, Chroma, or PostgreSQL pgvector?',
    whyUsedDesc: 'External databases add 50–200ms network round-trips, cloud bills, and complex container setups. For personal resumes and profiles with under 5,000 chunks, a linear dot-product scan in RAM takes under 1 millisecond. It uses zero server cost and guarantees zero data leaks.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 4: The Vector Galaxy. Organizing knowledge in memory. All chunk coordinates are stored in memory. Because similar concepts have similar coordinates, chunks naturally group into semantic neighborhoods: work experience gathers in one area, tech skills gather nearby, and education gathers in another, with zero manual tagging needed.',
    voiceScriptDeep: 'Scene 4: The Vector Galaxy: In-Memory Spatial Index. What is used: An in-memory JavaScript array storing raw text alongside 384-dimensional Float32Arrays in RAM. For what it is used: Storing and indexing document chunks so they can be searched instantly. Why it is used: Heavy vector databases like Pinecone or Chroma add network latency, cloud bills, and Docker setup. For documents under 5,000 chunks, an in-memory linear scan takes less than 1 millisecond with zero server cost and total privacy.',
  },
  {
    id: 'question',
    number: 5,
    title: 'The Question Arrives',
    subtitle: 'Turning the user question into the same coordinate language',
    emoji: '💬',
    color: '#ec4899',
    analogy: 'Giving the question its own GPS coordinate so it can navigate the knowledge galaxy.',
    eli5: 'When you type "What machine learning models has he trained?", your question is immediately passed through the EXACT same neural network. It turns into a glowing query vector with 384 numbers, ready to be compared against your document.',
    keyTakeaway: 'Both the question and the document now speak the exact same geometric language.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Web Worker Query Pipeline (useQuery.js + embedWorker.js)',
    techWhat: 'Dedicated background Web Worker executing the ONNX transformer pipeline on the user prompt.',
    forWhat: 'Generating a normalized query vector (Float32Array[384]) from the raw natural language question.',
    forWhatDesc: 'Takes the user input string, tokenizes it with WordPiece, and extracts the sentence vector.',
    whyUsed: 'Why must it share the exact same embedding model?',
    whyUsedDesc: 'If the question were embedded by a different model (e.g. OpenAI ada-002), the coordinate axes would not match, resulting in zero semantic correlation. Sharing the exact same model guarantees coordinate alignment. Running in a Web Worker keeps the UI thread responsive at 60 FPS.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 5: The Question Arrives. When you ask a question, like "What machine learning models has he trained?", your question is immediately passed through the exact same neural network. It turns into a glowing query vector with 384 numbers. Now, your question and your document speak the exact same geometric language.',
    voiceScriptDeep: 'Scene 5: The Question Arrives: Shared Vector Space. What is used: The exact same all-MiniLM-L6-v2 model running inside a background Web Worker. For what it is used: Converting the user question into a 384-dimensional query vector. Why it is used: To compare a question to a document, both must inhabit the exact same geometric coordinate space. Sharing the exact same model guarantees alignment. Running in a Web Worker keeps your browser UI fast and stutter-free.',
  },
  {
    id: 'radar',
    number: 6,
    title: 'Radar Sweep: Cosine Similarity',
    subtitle: 'Finding chunks pointing in the exact same direction',
    emoji: '📡',
    color: '#10b981',
    analogy: 'Two flashlights shining into the dark: the closer their beams align, the higher the score!',
    eli5: 'We measure the angle between your question vector and every chunk vector. If two vectors point in almost the same direction (angle near 0°), cosine similarity is close to 100%! In under 2 milliseconds, the system scans all chunks and identifies the top 2–4 most relevant passages.',
    keyTakeaway: 'Cosine similarity measures angular alignment, ignoring word length or trivia.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Cosine Similarity / Dot Product Search (cosineSimilarity & searchChunks)',
    techWhat: 'Vector dot product algorithm: dot = sum(q[i] * chunk[i]), sorted descending to select Top-K.',
    forWhat: 'Scoring all chunks by semantic relevance and picking the top 4 most pertinent context passages.',
    forWhatDesc: 'Filters out 90% of irrelevant document text and ranks the remaining passages with precision scores (0.0 to 1.0).',
    whyUsed: 'Why Cosine Similarity over keyword search (BM25 or regex)?',
    whyUsedDesc: 'Keyword search fails on synonyms (e.g. "coder" vs "programmer", "salary" vs "compensation"). Cosine similarity evaluates directional alignment in semantic space, matching concepts regardless of exact wording. Because vectors are L2-normalized, dot product equals cosine similarity without expensive square root math.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 6: Radar Sweep. Cosine similarity search. Think of two flashlights shining in the dark: the closer their beams align, the higher the score. We calculate the angle between your question vector and every chunk vector in under 2 milliseconds. The top matching chunks light up with scores over 80 percent, while irrelevant topics are filtered out.',
    voiceScriptDeep: 'Scene 6: Radar Sweep: Cosine Similarity Scoring. What is used: A vector dot product algorithm comparing the query vector against every chunk in memory, followed by Top-K sorting. For what it is used: Measuring semantic alignment and filtering out irrelevant document sections. Why it is used: Keyword search fails on synonyms. If your document says automobile and the user asks about cars, keyword search finds nothing. Cosine similarity evaluates the angle between meaning vectors, matching concepts regardless of phrasing in under 1 millisecond.',
  },
  {
    id: 'prompt',
    number: 7,
    title: 'Assembling the Open-Book Exam',
    subtitle: 'Injecting verified facts into the prompt envelope',
    emoji: '📋',
    color: '#f97316',
    analogy: 'Handing the AI a folder with the exact 2 relevant bookmarked pages and saying "Read only this!"',
    eli5: 'This is the "A" in RAG: Augmentation. We take your original question, attach the winning text chunks labeled [1] and [2], and write a strict instruction: "Answer ONLY using the facts in passages [1] and [2]. Cite your sources inline."',
    keyTakeaway: 'The AI is grounded in real facts from your file, eliminating hallucinations.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Prompt Injection Grounding Template (server/src/routes/query.js)',
    techWhat: 'Structured system message orchestrator with context boundaries and citation brackets.',
    forWhat: 'Packaging retrieved Top-K chunks into an augmented prompt envelope alongside the user question.',
    forWhatDesc: 'Limits context size to token budget (e.g. 3,000 tokens) and formats source passages as [1] ... [2] ...',
    whyUsed: 'Why is this prompt structure critical to stopping hallucinations?',
    whyUsedDesc: 'Without strict system grounding rules, LLMs fall back on fuzzy training weights. By commanding the model: "Answer ONLY from the context below; cite inline as [1], [2]; if not found, say you do not know", and setting temperature to 0.2, the model acts as a factual synthesizer rather than a creative fiction author.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 7: Assembling the Open-Book Exam. This is the A in RAG: Augmentation. We take your question, attach the winning text passages labeled Source 1 and Source 2, and write a strict rule for the AI: "Answer only using the verified facts from these passages, and cite your sources inline." The AI is grounded in real facts, preventing hallucinations.',
    voiceScriptDeep: 'Scene 7: Assembling the Open-Book Exam: Grounded Prompt Injection. What is used: A structured prompt assembly template that combines the user question with top retrieved context chunks and bracketed citation tags. For what it is used: Transforming an open-ended generative task into a grounded, closed-context extraction. Why it is used: Without this augmented prompt, the LLM hallucinates answers based on outdated internet data. Enforcing citations and setting temperature to 0.2 makes the model 100% accountable to your document.',
  },
  {
    id: 'answer',
    number: 8,
    title: 'The AI Answers with Citations',
    subtitle: 'A truthful, auditable response with clickable evidence',
    emoji: '✨',
    color: '#3b82f6',
    analogy: 'A court report where every single claim references Exhibit A and Exhibit B.',
    eli5: 'The LLM reads the assembled prompt and streams back a fluent answer. Crucially, every claim has a citation tag like [1] or [2]. If you click the citation, the app highlights the exact sentence in your document where that fact came from!',
    keyTakeaway: '100% verifiable answers with proof you can inspect with your own eyes.',
    
    // Technical Deep Dive: What & Why
    techUsed: 'Server-Sent Events (SSE) + Multi-Provider Fallback Orchestrator',
    techWhat: 'HTTP text/event-stream async generator streaming tokens live with automatic failover chain.',
    forWhat: 'Streaming the generated answer word-by-word with zero downtime and clickable audit tags.',
    forWhatDesc: 'Primary: Groq (Llama 3.1 8B). Fallbacks: Gemini Flash, OpenRouter, Cerebras, and local Extractive RAG.',
    whyUsed: 'Why SSE streaming and why the Multi-Provider Fallback chain?',
    whyUsedDesc: 'Waiting 10 seconds for a full answer feels slow; SSE provides instant Time-To-First-Token in ~200ms. Free AI API tiers frequently hit HTTP 429 rate limits. The fallback chain automatically hops to backup providers in milliseconds without the user ever seeing an error. Offline Extractive mode ensures the app works even with zero internet.',
    
    // Voiceover Scripts
    voiceScriptEli5: 'Scene 8: The AI Delivers the Answer. The language model reads the assembled prompt and streams back a fluent, accurate answer. Crucially, every claim includes a citation chip like Bracket 1 or Bracket 2. You can click any citation to see the exact sentence in your original document that proves the answer. That is RAG: fast, private, and 100 percent verifiable.',
    voiceScriptDeep: 'Scene 8: The AI Delivers the Answer: Streaming and Fallback. What is used: Server-Sent Events streaming combined with a multi-provider fallback orchestrator linking to interactive citation tags. For what it is used: Delivering a live, word-by-word response that is completely verifiable. Why it is used: Server-Sent Events stream the first word in 200 milliseconds instead of making you wait. If a provider hits rate limits, the automated fallback chain immediately reroutes to backup models or our offline Extractive engine. Inline citations allow instant verification of every fact.',
  },
];

const SAMPLE_QUERIES = [
  'What machine learning projects did he work on?',
  'Where did he go to university?',
  'What transformer models has he trained?'
];

export default function RagStoryPlayer() {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 0.8x, 1x, 1.2x
  const [voiceDepth, setVoiceDepth] = useState('deep'); // 'deep' (What & Why) | 'eli5' (Quick story)
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [interactiveState, setInteractiveState] = useState({
    hallucinationAsked: false,
    isSlicing: false,
    attentionActive: false,
    activeCluster: null,
    selectedQueryIdx: 0,
    radarPingActive: false,
    radarTopK: 2,
    isClamped: true,
    activeCitation: null,
    simulateNoRag: false,
  });

  const timerRef = useRef(null);
  const scene = SCENES[currentScene];

  const {
    isSupported: isVoiceSupported,
    isSpeaking,
    isVoiceEnabled,
    voices,
    selectedVoice,
    setSelectedVoice,
    voiceRate,
    setVoiceRate,
    speak,
    stop: stopVoice,
    toggleVoice,
  } = useVoiceover();

  // Active script based on depth toggle
  const activeScript = voiceDepth === 'deep' ? scene.voiceScriptDeep : scene.voiceScriptEli5;

  // Speech & Auto-play synchronization (only runs when auto-play is active)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isPlaying) {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (isVoiceEnabled && isVoiceSupported) {
      // Speak the selected voiceover during auto-play
      speak(activeScript, () => {
        // When speech finishes, wait 1.2s and go to next scene
        if (isPlaying) {
          timerRef.current = setTimeout(() => {
            setCurrentScene(prev => (prev + 1) % SCENES.length);
          }, 1200);
        }
      });
    } else {
      // Voice is off: fallback to timed auto-play
      const duration = 6500 / playSpeed;
      timerRef.current = setTimeout(() => {
        setCurrentScene(prev => (prev + 1) % SCENES.length);
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentScene, isPlaying, isVoiceEnabled, isVoiceSupported, playSpeed, voiceDepth, speak, activeScript]);

  const goToScene = (index) => {
    stopVoice();
    setCurrentScene(index);
    setIsPlaying(false);
  };

  const nextScene = () => {
    stopVoice();
    setCurrentScene((currentScene + 1) % SCENES.length);
    setIsPlaying(false);
  };

  const prevScene = () => {
    stopVoice();
    setCurrentScene((currentScene - 1 + SCENES.length) % SCENES.length);
    setIsPlaying(false);
  };

  return (
    <div className="story-player-container">
      {/* Top Banner: Easy Mode Header */}
      <div className="story-header glass">
        <div className="story-header-left">
          <div className="story-badge-row">
            <span className="story-badge">🎬 ANIMATED STORY &bull; LEVEL ZERO</span>
            {isVoiceSupported && (
              <span className={`story-audio-badge ${isSpeaking ? 'active' : ''}`}>
                {isSpeaking
                  ? `🎙️ ${voiceDepth === 'deep' ? 'DEEP DIVE (WHAT & WHY)' : 'QUICK STORY'} PLAYING`
                  : isVoiceEnabled
                  ? `🔊 VOICEOVER: ${voiceDepth === 'deep' ? 'DEEP (WHAT & WHY)' : 'QUICK'}`
                  : '🔇 VOICEOVER MUTED'}
              </span>
            )}
          </div>
          <h2 className="story-main-title">How RAG Works: The Animated Story</h2>
          <p className="story-main-desc">
            Visual storytelling with detailed voiceover narration explaining <strong>what is used</strong>, <strong>for what it is used</strong>, and <strong>why it is used</strong>.
          </p>
        </div>

        {/* Global Controls */}
        <div className="story-controls">
          {/* Narration Depth Switcher */}
          <div className="voice-depth-toggle" title="Toggle Voiceover Detail Level">
            <button
              className={`depth-btn ${voiceDepth === 'deep' ? 'active' : ''}`}
              onClick={() => {
                setVoiceDepth('deep');
                if (isSpeaking) {
                  speak(scene.voiceScriptDeep);
                }
              }}
            >
              🎓 Deep (What &amp; Why)
            </button>
            <button
              className={`depth-btn ${voiceDepth === 'eli5' ? 'active' : ''}`}
              onClick={() => {
                setVoiceDepth('eli5');
                if (isSpeaking) {
                  speak(scene.voiceScriptEli5);
                }
              }}
            >
              👶 Quick Story
            </button>
          </div>

          {/* Voiceover On/Off Toggle Button */}
          {isVoiceSupported && (
            <button
              className={`voice-toggle-btn ${isVoiceEnabled ? 'enabled' : 'disabled'} ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggleVoice}
              title={isVoiceEnabled ? 'Mute Voiceover Narration' : 'Enable Voiceover Narration'}
              id="voiceover-toggle-btn"
            >
              <span className="voice-icon">{isVoiceEnabled ? '🎙️' : '🔇'}</span>
              <span className="voice-text">{isVoiceEnabled ? 'Voice: ON' : 'Voice: OFF'}</span>
              {isSpeaking && (
                <div className="voice-equalizer" title="Voiceover Active">
                  <span className="eq-bar bar1" />
                  <span className="eq-bar bar2" />
                  <span className="eq-bar bar3" />
                </div>
              )}
            </button>
          )}

          {/* Voice Settings Gear */}
          {isVoiceSupported && isVoiceEnabled && (
            <button
              className={`voice-settings-btn ${showVoiceSettings ? 'active' : ''}`}
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              title="Voice & Speed Settings"
              id="voice-settings-gear-btn"
            >
              ⚙️
            </button>
          )}

          {/* Auto-Play Toggle Button */}
          <button
            className={`story-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => {
              if (isPlaying) {
                stopVoice();
                setIsPlaying(false);
              } else {
                setIsPlaying(true);
              }
            }}
            title={isPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
            id="story-play-toggle-btn"
          >
            {isPlaying ? '⏸ Pause' : '▶ Auto-Play'}
          </button>

          {/* Speech Rate Pills */}
          <div className="speed-pills">
            {[0.8, 1, 1.2].map((spd) => (
              <button
                key={spd}
                className={`speed-pill ${voiceRate === spd ? 'active' : ''}`}
                onClick={() => {
                  setVoiceRate(spd);
                  setPlaySpeed(spd);
                }}
                title={`Narration speed ${spd}x`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Settings Popover */}
      {showVoiceSettings && isVoiceSupported && (
        <div className="voice-settings-panel glass">
          <div className="voice-settings-header">
            <span>🎙️ Voiceover Audio Settings</span>
            <button className="voice-close-btn" onClick={() => setShowVoiceSettings(false)}>✕</button>
          </div>
          <div className="voice-settings-content">
            <div className="voice-settings-row">
              <label htmlFor="voice-select">Narrator Voice:</label>
              <select
                id="voice-select"
                className="voice-select-box"
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const found = voices.find(v => v.name === e.target.value);
                  if (found) setSelectedVoice(found);
                }}
              >
                {voices.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
            <div className="voice-settings-row">
              <label>Narration Mode:</label>
              <div className="rate-selector">
                <button
                  className={`rate-btn ${voiceDepth === 'deep' ? 'active' : ''}`}
                  onClick={() => setVoiceDepth('deep')}
                >
                  🎓 Deep Tech (What &amp; Why)
                </button>
                <button
                  className={`rate-btn ${voiceDepth === 'eli5' ? 'active' : ''}`}
                  onClick={() => setVoiceDepth('eli5')}
                >
                  👶 Quick Story
                </button>
              </div>
            </div>
            <div className="voice-settings-row">
              <label>Narration Pace:</label>
              <div className="rate-selector">
                {[0.8, 1.0, 1.2].map(r => (
                  <button
                    key={r}
                    className={`rate-btn ${voiceRate === r ? 'active' : ''}`}
                    onClick={() => {
                      setVoiceRate(r);
                      setPlaySpeed(r);
                    }}
                  >
                    {r}x {r === 0.8 ? '(Relaxed)' : r === 1.0 ? '(Normal)' : '(Fast)'}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="test-voice-btn"
              onClick={() => speak("Hello! I am your profile RAG AI narrator. I explain what is used, for what it is used, and why it is used.")}
            >
              ▶ Test This Voice
            </button>
          </div>
        </div>
      )}

      {/* Story Timeline Bar */}
      <div className="story-timeline">
        {SCENES.map((s, idx) => (
          <button
            key={s.id}
            className={`timeline-step ${idx === currentScene ? 'active' : ''} ${idx < currentScene ? 'passed' : ''}`}
            style={{ '--step-color': s.color }}
            onClick={() => goToScene(idx)}
          >
            <span className="step-num">{s.number}</span>
            <span className="step-icon">{s.emoji}</span>
            <span className="step-label">{s.title.split(':')[0]}</span>
            {idx === currentScene && <div className="step-pulse-ring" />}
          </button>
        ))}
      </div>

      {/* Main Animated Theater Stage */}
      <div className="story-theater glass" style={{ '--accent-glow': scene.color }}>
        {/* Progress Bar for Current Scene */}
        <div className="scene-progress-bar">
          <div
            className={`scene-progress-fill ${isPlaying ? 'animating' : ''}`}
            style={{
              animationDuration: `${(isSpeaking ? 16000 : 7000) / playSpeed}ms`,
              backgroundColor: scene.color,
            }}
            key={`${currentScene}-${isPlaying}-${isSpeaking}-${voiceDepth}`}
          />
        </div>

        {/* Scene Header */}
        <div className="theater-header">
          <div className="theater-header-top">
            <div className="theater-step-tag" style={{ color: scene.color, borderColor: scene.color }}>
              SCENE {scene.number} OF {SCENES.length}
            </div>

            {/* Individual Listen / Stop Button */}
            {isVoiceSupported && (
              <button
                className={`scene-listen-btn ${isSpeaking ? 'speaking' : ''}`}
                onClick={() => {
                  if (isSpeaking) {
                    stopVoice();
                  } else {
                    speak(activeScript);
                  }
                }}
                title={isSpeaking ? 'Stop voiceover' : 'Listen to this scene narration'}
              >
                {isSpeaking ? (
                  <>
                    <span className="stop-icon">⏹</span>
                    <span>Stop Voice</span>
                  </>
                ) : (
                  <>
                    <span className="mic-icon">🎙️</span>
                    <span>{voiceDepth === 'deep' ? 'Listen: What & Why' : 'Listen: Quick Story'}</span>
                  </>
                )}
              </button>
            )}
          </div>
          <h3 className="theater-title">{scene.title}</h3>
          <p className="theater-subtitle">{scene.subtitle}</p>
        </div>

        {/* Animated Canvas */}
        <div className="theater-canvas">
          {/* SCENE 1: THE PROBLEM */}
          {scene.id === 'problem' && (
            <div className="anim-scene scene-problem">
              <div className="bot-character">
                <div className={`bot-head ${interactiveState.hallucinationAsked ? 'head-shaking' : ''}`}>
                  <div className="bot-eyes">
                    <span className="eye">{interactiveState.hallucinationAsked ? '😵' : '👀'}</span>
                  </div>
                  <div className={`bot-mouth ${interactiveState.hallucinationAsked ? 'gasp' : 'confused'}`}>
                    {interactiveState.hallucinationAsked ? '⭕' : '〰️'}
                  </div>
                </div>
                <div className={`bot-bubble ${interactiveState.hallucinationAsked ? 'hallucinating-bubble' : ''}`}>
                  {interactiveState.hallucinationAsked ? (
                    <span className="bubble-text hallucinate">
                      "Uhh... without your PDF, I'm just guessing! Maybe Bharathikannan is a medieval French baker? 🥖 (🚨 100% Hallucinated Guess!)"
                    </span>
                  ) : (
                    <span className="bubble-text">
                      "I know general internet facts, but your private PDF is completely locked out of my frozen neural weights!"
                    </span>
                  )}
                </div>
              </div>

              <div className="doc-character">
                <div className="doc-paper">
                  <div className="doc-header-line" />
                  <div className="doc-lock">🔒</div>
                  <div className="doc-text-preview">
                    <span>Confidential Resume.pdf</span>
                    <p>Bharathikannan &bull; Senior ML Engineer</p>
                  </div>
                </div>
                <div className="doc-barrier-badge">
                  <span>🚫 Model weights cannot see private files!</span>
                </div>
              </div>

              <div className="interactive-scene-action">
                <button
                  className={`interactive-btn ${interactiveState.hallucinationAsked ? 'btn-active-danger' : ''}`}
                  onClick={() => {
                    if (!interactiveState.hallucinationAsked) {
                      playSliceSound();
                    } else {
                      playSuccessChime();
                    }
                    setInteractiveState((s) => ({ ...s, hallucinationAsked: !s.hallucinationAsked }));
                  }}
                  id="test-hallucinate-btn"
                >
                  {interactiveState.hallucinationAsked
                    ? '🛡️ Reset to Default View'
                    : '❓ Test: Ask AI Without Document (Simulate Hallucination)'}
                </button>
              </div>
            </div>
          )}

          {/* SCENE 2: CHUNKING & CONVEYOR */}
          {scene.id === 'chunking' && (
            <div className="anim-scene scene-chunking">
              <div className="big-doc-container">
                <div className={`big-doc ${interactiveState.isSlicing ? 'doc-slicing' : ''}`}>
                  <div className="doc-title-bar">
                    <span>📄 Full Document (15,000 characters)</span>
                    <span className="sliding-step-tag">Window: 600 chars &bull; Overlap: 100 chars</span>
                  </div>
                  <div className="doc-body-text">
                    <div className="chunk-slice chunk-slice-1">
                      <span className="slice-badge">Chunk 1 &bull; Characters 0–600</span>
                      <p>"Senior ML Engineer at Acme Corp. Led NLP pipeline development..."</p>
                    </div>

                    <div className="overlap-band">
                      <span className="overlap-tag">🔁 100-char Overlap Window (Preserves complete sentences)</span>
                    </div>

                    <div className="chunk-slice chunk-slice-2">
                      <span className="slice-badge">Chunk 2 &bull; Characters 500–1100</span>
                      <p>"...pipeline development. Core skills: PyTorch, Transformers, ONNX..."</p>
                    </div>

                    <div className="overlap-band">
                      <span className="overlap-tag">🔁 100-char Overlap Window</span>
                    </div>

                    <div className="chunk-slice chunk-slice-3">
                      <span className="slice-badge">Chunk 3 &bull; Characters 1000–1600</span>
                      <p>"...ONNX and Docker. Graduated B.Tech in Computer Science..."</p>
                    </div>
                  </div>

                  {/* Animated Precision Cutter */}
                  <div className={`laser-cutter-arm ${interactiveState.isSlicing ? 'rapid-slice' : ''}`}>
                    <div className="cutter-blade">✂️ Laser Cutter</div>
                    <div className="laser-beam" />
                  </div>
                </div>
              </div>

              {/* Conveyor Belt Mechanism */}
              <div className="conveyor-mechanism">
                <div className="conveyor-track">
                  <div className="conveyor-stripe-anim" />
                  <div className="cards-output-strip">
                    <div className="card-item card-1">📇 Chunk 1 (Chars 0-600)</div>
                    <div className="card-item card-2">📇 Chunk 2 (Chars 500-1100)</div>
                    <div className="card-item card-3">📇 Chunk 3 (Chars 1000-1600)</div>
                  </div>
                </div>
                <div className="conveyor-rollers">
                  <span className="roller-gear spinning-gear">⚙️</span>
                  <span className="roller-gear spinning-gear">⚙️</span>
                  <span className="roller-gear spinning-gear">⚙️</span>
                  <span className="roller-gear spinning-gear">⚙️</span>
                </div>
              </div>

              {/* Interactive Slicer Action */}
              <div className="interactive-scene-action">
                <button
                  className="interactive-btn laser-trigger-btn"
                  onClick={() => {
                    playSliceSound();
                    setInteractiveState((s) => ({ ...s, isSlicing: true }));
                    setTimeout(() => setInteractiveState((s) => ({ ...s, isSlicing: false })), 1200);
                  }}
                  id="trigger-cutter-btn"
                >
                  ✂️ Trigger Precision Cutter
                </button>
                <div className="math-pill-badge">
                  <span>📐 Formula: <strong>Step = Size - Overlap = 600 - 100 = 500 chars</strong> &bull; ~30 atomic cards</span>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 3: EMBEDDING MACHINE & TOKENIZER */}
          {scene.id === 'embedding' && (
            <div className="anim-scene scene-embedding">
              {/* Tokenizer Subword Strip */}
              <div className="tokenizer-strip">
                <span className="tokenizer-label">Step 1: WordPiece Subword Tokenizer</span>
                <div className="token-bricks-row">
                  <span className="token-brick">[Senior · #3412]</span>
                  <span className="token-brick">[ML · #9021]</span>
                  <span className="token-brick">[Engineer · #1120]</span>
                  <span className="token-brick">[building · #2844]</span>
                  <span className="token-brick">[NLP · #7654]</span>
                </div>
              </div>

              <div className="embedding-flow-row">
                <div className="input-chunk-packet">
                  <div className="packet-card">
                    <span className="packet-label">Raw Text Chunk</span>
                    <p>"Senior ML Engineer building transformer search pipelines"</p>
                  </div>
                  <div className="packet-arrow-moving">➡️</div>
                </div>

                <div className={`neural-converter-box ${interactiveState.attentionActive ? 'attention-glow' : ''}`}>
                  <div className="converter-header">
                    <span className="cog-icon rotating">⚙️</span>
                    <span>MiniLM-L6-v2 Neural Engine</span>
                    <span className="cog-icon rotating-reverse">⚙️</span>
                  </div>
                  <div className="neural-nodes-grid">
                    <div className="neural-layer">
                      <span className="n-dot pulse-1" />
                      <span className="n-dot pulse-2" />
                      <span className="n-dot pulse-3" />
                    </div>
                    <div className="neural-layer">
                      <span className="n-dot pulse-2" />
                      <span className="n-dot pulse-1" />
                      <span className="n-dot pulse-3" />
                    </div>
                    <div className="neural-layer">
                      <span className="n-dot pulse-3" />
                      <span className="n-dot pulse-2" />
                      <span className="n-dot pulse-1" />
                    </div>
                  </div>
                  <div className="converter-status">
                    {interactiveState.attentionActive ? '⚡ 6 Attention Heads Active!' : 'Translating Meaning into Geometry...'}
                  </div>
                </div>

                <div className="output-vector-packet">
                  <div className="packet-arrow-moving">➡️</div>
                  <div className="vector-pill-card">
                    <span className="vector-pill-badge">Float32Array(384)</span>
                    <div className="vector-numbers">
                      <code>[ +0.142, -0.428, +0.881, -0.019, ... ]</code>
                    </div>
                    <span className="vector-note">📍 Exact 384D GPS coordinate of thought</span>
                  </div>
                </div>
              </div>

              {/* Interactive Attention Pulse */}
              <div className="interactive-scene-action">
                <button
                  className={`interactive-btn attention-btn ${interactiveState.attentionActive ? 'active' : ''}`}
                  onClick={() => {
                    playNeuralPulse();
                    setInteractiveState((s) => ({ ...s, attentionActive: true }));
                    setTimeout(() => setInteractiveState((s) => ({ ...s, attentionActive: false })), 1400);
                  }}
                  id="pulse-attention-btn"
                >
                  🧠 Pulse Transformer Self-Attention
                </button>
                <div className="math-pill-badge">
                  <span>📐 L2 Normalization: <strong>||e|| = 1.0</strong> on unit hypersphere &bull; Cosine Similarity = Dot Product</span>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 4: VECTOR GALAXY & CLUSTER EXPLORER */}
          {scene.id === 'galaxy' && (
            <div className="anim-scene scene-galaxy">
              {/* Interactive Cluster Selector */}
              <div className="galaxy-cluster-bar">
                <span className="cluster-bar-title">Filter Semantic Clusters:</span>
                <button
                  className={`cluster-filter-btn ${interactiveState.activeCluster === 'work' ? 'active' : ''}`}
                  onClick={() => {
                    playRadarPing();
                    setInteractiveState((s) => ({ ...s, activeCluster: s.activeCluster === 'work' ? null : 'work' }));
                  }}
                >
                  💼 Work Experience
                </button>
                <button
                  className={`cluster-filter-btn ${interactiveState.activeCluster === 'skills' ? 'active' : ''}`}
                  onClick={() => {
                    playRadarPing();
                    setInteractiveState((s) => ({ ...s, activeCluster: s.activeCluster === 'skills' ? null : 'skills' }));
                  }}
                >
                  ⚡ Tech Skills
                </button>
                <button
                  className={`cluster-filter-btn ${interactiveState.activeCluster === 'edu' ? 'active' : ''}`}
                  onClick={() => {
                    playRadarPing();
                    setInteractiveState((s) => ({ ...s, activeCluster: s.activeCluster === 'edu' ? null : 'edu' }));
                  }}
                >
                  🎓 Education
                </button>
              </div>

              <div className="galaxy-radar-view">
                <div className="radar-grid-bg">
                  <div className="radar-ring ring-1" />
                  <div className="radar-ring ring-2" />
                  <div className="radar-axis axis-x" />
                  <div className="radar-axis axis-y" />
                </div>

                {/* Cluster 1: Work Experience */}
                <div className={`galaxy-cluster cluster-work ${interactiveState.activeCluster === 'work' ? 'highlighted-cluster' : ''}`}>
                  <div className="cluster-glow" />
                  <div className="cluster-dot d1" />
                  <div className="cluster-dot d2" />
                  <div className="cluster-label">💼 Work Experience (cos θ = 0.94)</div>
                </div>

                {/* Cluster 2: Tech Skills */}
                <div className={`galaxy-cluster cluster-skills ${interactiveState.activeCluster === 'skills' ? 'highlighted-cluster' : ''}`}>
                  <div className="cluster-glow" />
                  <div className="cluster-dot d3" />
                  <div className="cluster-dot d4" />
                  <div className="cluster-label">⚡ Tech Skills (cos θ = 0.89)</div>
                </div>

                {/* Cluster 3: Education */}
                <div className={`galaxy-cluster cluster-edu ${interactiveState.activeCluster === 'edu' ? 'highlighted-cluster' : ''}`}>
                  <div className="cluster-glow" />
                  <div className="cluster-dot d5" />
                  <div className="cluster-label">🎓 Education (cos θ = 0.82)</div>
                </div>
              </div>

              <div className="galaxy-tip">
                <span>💡 Magic: Chunks with similar topics naturally orbit together in 384D space without any human tagging!</span>
              </div>
            </div>
          )}

          {/* SCENE 5: USER QUESTION */}
          {scene.id === 'question' && (
            <div className="anim-scene scene-question">
              {/* Query Selector Options */}
              <div className="sample-query-pills">
                <span className="sample-query-title">Pick a Test Question:</span>
                {SAMPLE_QUERIES.map((q, idx) => (
                  <button
                    key={q}
                    className={`sample-query-pill ${interactiveState.selectedQueryIdx === idx ? 'active' : ''}`}
                    onClick={() => {
                      playNeuralPulse();
                      setInteractiveState((s) => ({ ...s, selectedQueryIdx: idx }));
                    }}
                  >
                    "{q}"
                  </button>
                ))}
              </div>

              <div className="question-flow-stage">
                <div className="user-avatar-block">
                  <div className="user-icon">👤</div>
                  <div className="user-label">You (User)</div>
                </div>

                <div className="typing-query-card">
                  <div className="query-bubble">
                    <span className="query-prefix">Question:</span>
                    <span className="query-text">"{SAMPLE_QUERIES[interactiveState.selectedQueryIdx]}"</span>
                    <span className="typing-cursor">|</span>
                  </div>
                  <div className="query-flow-arrow">⚡ Instantly embedded into same 384D space! ➡️</div>
                </div>

                <div className="query-vector-laser">
                  <div className="laser-pointer">
                    <span className="laser-badge">Query Vector (q)</span>
                    <div className="laser-arrow-indicator">🎯 Float32Array(384)</div>
                  </div>
                </div>
              </div>

              <div className="query-math-note">
                <span>📐 Both Question and Chunks inhabit the EXACT same 384D hypersphere, enabling direct geometric angle comparisons!</span>
              </div>
            </div>
          )}

          {/* SCENE 6: RADAR SEARCH & COSINE GAUGE */}
          {scene.id === 'radar' && (
            <div className="anim-scene scene-radar">
              {/* Radar Controls */}
              <div className="radar-controls-strip">
                <button
                  className={`interactive-btn sonar-ping-btn ${interactiveState.radarPingActive ? 'active' : ''}`}
                  onClick={() => {
                    playRadarPing();
                    setInteractiveState((s) => ({ ...s, radarPingActive: true }));
                    setTimeout(() => setInteractiveState((s) => ({ ...s, radarPingActive: false })), 1200);
                  }}
                  id="ping-radar-btn"
                >
                  📡 Ping Sonar Scanner
                </button>

                <div className="topk-selector-group">
                  <span className="topk-label">Filter Depth:</span>
                  {[1, 2, 3].map((k) => (
                    <button
                      key={k}
                      className={`topk-btn ${interactiveState.radarTopK === k ? 'active' : ''}`}
                      onClick={() => {
                        playRadarPing();
                        setInteractiveState((s) => ({ ...s, radarTopK: k }));
                      }}
                    >
                      Top-{k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="radar-stage-layout">
                <div className="radar-screen">
                  <div className={`radar-sweep-beam ${interactiveState.radarPingActive ? 'rapid-sweep' : ''}`} />

                  {/* Query Vector */}
                  <div className="radar-query-point">
                    <div className="query-star">🎯</div>
                    <span className="star-label">Query Vector</span>
                  </div>

                  {/* Chunk 1: Top match */}
                  <div className="radar-target target-best hit">
                    <div className="target-ring pulse" />
                    <div className="target-icon">🥇</div>
                    <div className="target-info">
                      <span className="score-badge green">94% MATCH (cos θ = 0.94)</span>
                      <span className="desc">Work Exp: "Led NLP team building transformers"</span>
                    </div>
                  </div>

                  {/* Chunk 2: Good match */}
                  {interactiveState.radarTopK >= 2 && (
                    <div className="radar-target target-good hit">
                      <div className="target-ring pulse" />
                      <div className="target-icon">🥈</div>
                      <div className="target-info">
                        <span className="score-badge blue">82% MATCH (cos θ = 0.82)</span>
                        <span className="desc">Skills: "Trained PyTorch semantic models"</span>
                      </div>
                    </div>
                  )}

                  {/* Chunk 3: Filtered / Discarded */}
                  {interactiveState.radarTopK >= 3 && (
                    <div className="radar-target target-far dim">
                      <div className="target-icon">❌</div>
                      <div className="target-info">
                        <span className="score-badge grey">21% MATCH (cos θ = 0.21)</span>
                        <span className="desc">Hobbies: "Enjoys chess & badminton" (Discarded)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Similarity Radial Dial Gauge */}
                <div className="similarity-gauge-card">
                  <div className="gauge-dial">
                    <svg className="gauge-svg" viewBox="0 0 100 100">
                      <circle className="gauge-bg" cx="50" cy="50" r="40" />
                      <circle className="gauge-fill" cx="50" cy="50" r="40" style={{ strokeDashoffset: '20' }} />
                    </svg>
                    <div className="gauge-number">94%</div>
                  </div>
                  <div className="gauge-info">
                    <span className="gauge-title">Cosine Similarity</span>
                    <span className="gauge-math">cos(θ) = 0.94 &bull; θ ≈ 19.9°</span>
                    <span className="gauge-eval">Semantic intent matches with near perfection!</span>
                  </div>
                </div>
              </div>

              <div className="radar-callout">
                <span>⏱️ In-memory dot-product scan completed in <strong>0.8 milliseconds</strong> across RAM!</span>
              </div>
            </div>
          )}

          {/* SCENE 7: PROMPT ASSEMBLY & CLAMP */}
          {scene.id === 'prompt' && (
            <div className="anim-scene scene-prompt">
              <div className={`dossier-clipboard ${interactiveState.isClamped ? 'clamped-active' : ''}`}>
                <div className="dossier-top-clip">📎 Open-Book Context Window</div>

                <div className="dossier-section system-rule-box">
                  <span className="box-tag">SYSTEM INSTRUCTIONS (STRICT GROUNDING)</span>
                  <p className="system-rule-text">
                    "You are a helpful assistant. Answer using ONLY the retrieved facts below. If not found, admit you do not know. Do NOT hallucinate."
                  </p>
                </div>

                <div className="dossier-section user-q-box">
                  <span className="box-tag">USER QUESTION</span>
                  <p>"What machine learning projects did he work on?"</p>
                </div>

                <div className="dossier-section verified-sources">
                  <span className="box-tag">RETRIEVED FACT PASSAGES (TOP-2)</span>

                  <div className="fact-strip fact-1">
                    <span className="fact-badge">[1]</span>
                    <p>"Bharathikannan led the NLP team at Acme Corp building transformer search engines..."</p>
                  </div>

                  <div className="fact-strip fact-2">
                    <span className="fact-badge">[2]</span>
                    <p>"He trained PyTorch semantic search models indexed over 1 million documents..."</p>
                  </div>
                </div>

                <div className="dossier-stamp">
                  <span>GROUNDED IN FACTS &bull; NO GUESSWORK</span>
                </div>
              </div>

              {/* Interactive Clamp Action */}
              <div className="interactive-scene-action">
                <button
                  className={`interactive-btn ${interactiveState.isClamped ? 'btn-active-success' : ''}`}
                  onClick={() => {
                    playNeuralPulse();
                    setInteractiveState((s) => ({ ...s, isClamped: !s.isClamped }));
                  }}
                  id="clamp-prompt-btn"
                >
                  {interactiveState.isClamped ? '🔓 Release Clamp Press' : '🗜️ Clamp Assembly Into Context Window'}
                </button>
                <div className="math-pill-badge">
                  <span>🛡️ Tamper-Proof Prompt &bull; Grounded Facts Sandwiched Between Prompt Guardrails</span>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 8: CITED ANSWER & VERIFICATION */}
          {scene.id === 'answer' && (
            <div className="anim-scene scene-answer">
              <div className="ai-author-header">
                <div className="ai-avatar">🤖</div>
                <div className="ai-info">
                  <strong>profileRAG Generator</strong>
                  <span>Grounded strictly on uploaded resume &bull; Streaming SSE in ~200ms</span>
                </div>
              </div>

              {interactiveState.simulateNoRag ? (
                <div className="hallucination-warning-card">
                  <div className="warning-card-header">
                    <span>🚨 UNGROUNDED AI WITHOUT RAG (HALLUCINATION)</span>
                  </div>
                  <p className="warning-card-text">
                    "Bharathikannan is a fictional character who invented the electric toaster in 1842 at the University of Paris..."
                  </p>
                  <span className="warning-card-alert">
                    ⚠️ The model had to guess because it had no access to your private document! No citations exist!
                  </span>
                </div>
              ) : (
                <div className="streamed-answer-box">
                  <p>
                    Based on the document, Bharathikannan has extensive machine learning experience:
                  </p>
                  <ul>
                    <li>
                      He led the NLP team at Acme Corp developing transformer-based semantic search engines{' '}
                      <button
                        className={`cite-btn ${interactiveState.activeCitation === 1 ? 'active' : ''}`}
                        onClick={() => {
                          playSuccessChime();
                          setInteractiveState((s) => ({
                            ...s,
                            activeCitation: s.activeCitation === 1 ? null : 1,
                          }));
                        }}
                        title="Click to view verified source sentence"
                        id="citation-1-btn"
                      >
                        [1]
                      </button>
                    </li>
                    <li>
                      He trained PyTorch models indexed across more than 1 million documents{' '}
                      <button
                        className={`cite-btn ${interactiveState.activeCitation === 2 ? 'active' : ''}`}
                        onClick={() => {
                          playSuccessChime();
                          setInteractiveState((s) => ({
                            ...s,
                            activeCitation: s.activeCitation === 2 ? null : 2,
                          }));
                        }}
                        title="Click to view verified source sentence"
                        id="citation-2-btn"
                      >
                        [2]
                      </button>
                    </li>
                  </ul>

                  {interactiveState.activeCitation && (
                    <div className="citation-peek-card gold-border-pulse">
                      <span className="peek-label">
                        🔍 Verifiable Document Proof for Citation [{interactiveState.activeCitation}]:
                      </span>
                      <p className="peek-text">
                        {interactiveState.activeCitation === 1
                          ? '"Bharathikannan led the NLP team at Acme Corp building transformer search engines..."'
                          : '"He trained PyTorch semantic search models indexed over 1 million documents..."'}
                      </p>
                      <span className="peek-source-badge">Verified Source: Resume.pdf &bull; Character Range {interactiveState.activeCitation === 1 ? '0–600' : '500–1100'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Hallucination vs RAG Toggle */}
              <div className="interactive-scene-action">
                <button
                  className={`interactive-btn ${interactiveState.simulateNoRag ? 'btn-active-success' : 'btn-active-danger'}`}
                  onClick={() => {
                    if (interactiveState.simulateNoRag) {
                      playSuccessChime();
                    } else {
                      playSliceSound();
                    }
                    setInteractiveState((s) => ({ ...s, simulateNoRag: !s.simulateNoRag }));
                  }}
                  id="simulate-rag-toggle-btn"
                >
                  {interactiveState.simulateNoRag
                    ? '🛡️ Switch to Grounded RAG Output'
                    : '⚠️ Simulate LLM Guessing Without RAG'}
                </button>
              </div>

              <div className="auditable-badge">
                <span>🛡️ Zero Hallucinations &bull; 100% Verifiable &bull; Click citations above to test!</span>
              </div>
            </div>
          )}
        </div>

        {/* TECHNICAL DEEP-DIVE: WHAT IS USED & WHY */}
        <div className="what-why-card glass" style={{ '--border-accent': scene.color }}>
          <div className="what-why-header">
            <span className="what-why-icon">🛠️</span>
            <div className="what-why-title-wrap">
              <h4 className="what-why-title">Technical Deep-Dive: What is Used &amp; Why It Was Chosen</h4>
              <span className="what-why-subtitle">Architecture Decisions, Trade-offs &amp; Internal Mechanics</span>
            </div>
            <span className="what-why-badge" style={{ color: scene.color, borderColor: scene.color }}>
              CONTEXT BREAKDOWN
            </span>
          </div>

          <div className="what-why-grid">
            <div className="what-why-col what-col">
              <div className="col-header">
                <span className="col-icon">🔧</span>
                <span className="col-label">WHAT IS USED</span>
              </div>
              <div className="col-name">{scene.techUsed}</div>
              <p className="col-text">{scene.techWhat}</p>
            </div>

            <div className="what-why-col for-what-col">
              <div className="col-header">
                <span className="col-icon">🎯</span>
                <span className="col-label">FOR WHAT IT IS USED</span>
              </div>
              <div className="col-name">{scene.forWhat}</div>
              <p className="col-text">{scene.forWhatDesc}</p>
            </div>

            <div className="what-why-col why-col">
              <div className="col-header">
                <span className="col-icon">💡</span>
                <span className="col-label">WHY IT IS USED (TRADE-OFFS)</span>
              </div>
              <div className="col-name">{scene.whyUsed}</div>
              <p className="col-text">{scene.whyUsedDesc}</p>
            </div>
          </div>
        </div>

        {/* Scene Explanations (Dual View: Analogy & ELI5) */}
        <div className="theater-explanation-grid">
          {/* Mental Analogy Box */}
          <div className="story-card analogy-card" style={{ '--border-col': scene.color }}>
            <div className="story-card-header">
              <span className="card-emoji">💡</span>
              <span className="card-title">Simple Real-World Analogy</span>
            </div>
            <p className="card-body-text">{scene.analogy}</p>
          </div>

          {/* ELI5 Plain English Box */}
          <div className="story-card eli5-card">
            <div className="story-card-header">
              <span className="card-emoji">👶</span>
              <span className="card-title">ELI5: Explain Like I'm 5</span>
            </div>
            <p className="card-body-text">{scene.eli5}</p>
          </div>
        </div>

        {/* Bottom Key Takeaway Strip */}
        <div className="story-takeaway-strip" style={{ backgroundColor: `${scene.color}15`, borderColor: scene.color }}>
          <span className="takeaway-badge">KEY TAKEAWAY:</span>
          <span className="takeaway-text">{scene.keyTakeaway}</span>
        </div>

        {/* Navigation Footer */}
        <div className="theater-nav">
          <button className="theater-nav-btn prev" onClick={prevScene} id="story-prev-btn">
            ◀ Previous Scene
          </button>

          <div className="theater-dots">
            {SCENES.map((_, i) => (
              <button
                key={i}
                className={`theater-dot ${i === currentScene ? 'active' : ''}`}
                style={i === currentScene ? { background: scene.color } : {}}
                onClick={() => goToScene(i)}
                aria-label={`Jump to scene ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="theater-nav-btn next"
            style={{ background: scene.color }}
            onClick={nextScene}
            id="story-next-btn"
          >
            Next Scene ▶
          </button>
        </div>
      </div>

      {/* The 4 Core RAG Principles (Zero Math Theory Summary) */}
      <div className="core-principles-section glass">
        <div className="principles-header">
          <span className="principles-tag">RAG FOUNDATIONS</span>
          <h3 className="principles-title">The 4 Golden Rules of RAG (In Plain English)</h3>
          <p className="principles-subtitle">If you remember only 4 things about RAG, remember these:</p>
        </div>

        <div className="principles-grid">
          <div className="principle-card">
            <div className="p-icon">📖</div>
            <h4>1. Open-Book vs Closed-Book</h4>
            <p>
              Traditional AI is like a student taking a closed-book test relying on memory. <strong>RAG makes it an open-book test</strong> where the student is handed the exact relevant page right before answering.
            </p>
          </div>

          <div className="principle-card">
            <div className="p-icon">📍</div>
            <h4>2. Meaning as Coordinates</h4>
            <p>
              Embeddings don't save words as text; they turn sentences into <strong>points in space</strong>. Sentences that mean the same thing end up as neighbors on the map, even if they use completely different vocabulary.
            </p>
          </div>

          <div className="principle-card">
            <div className="p-icon">📐</div>
            <h4>3. Search by Angle, Not Letters</h4>
            <p>
              Keyword search fails if you search for "automobile" and the document says "car". <strong>Cosine similarity searches by angle</strong>, instantly matching them because their meaning vectors point in the same direction.
            </p>
          </div>

          <div className="principle-card">
            <div className="p-icon">🛡️</div>
            <h4>4. Zero Hallucination Guarantee</h4>
            <p>
              By commanding the LLM to only answer from the provided chunk snippets and require <code>[1]</code>, <code>[2]</code> citation brackets, the model is strictly prevented from inventing fake facts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
