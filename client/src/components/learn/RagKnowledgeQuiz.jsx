import { useState } from 'react';
import { playSuccessChime } from './soundEffects.js';
import './RagKnowledgeQuiz.css';

const QUESTIONS = [
  {
    id: 1,
    category: 'Architecture',
    emoji: '📄',
    question: 'Why can’t we just feed an entire 100-page PDF directly to an LLM without RAG?',
    options: [
      { text: 'LLMs are legally restricted from reading PDF files', isCorrect: false },
      { text: 'Dumping huge text causes "Lost in the Middle" attention degradation, high latency, and memory bloat', isCorrect: true },
      { text: 'PDF files must always be converted to audio before AI can read them', isCorrect: false },
      { text: 'LLMs can only understand source code written in Python', isCorrect: false },
    ],
    explanation: 'Large prompts confuse the model’s attention mechanism (the "Lost in the Middle" phenomenon), dramatically slow down response time, and waste RAM. RAG retrieves only the exact 2 to 4 pinpoint paragraphs that contain the answer!',
  },
  {
    id: 2,
    category: 'Ingestion & Chunking',
    emoji: '✂️',
    question: 'Why do we overlap text chunks by 100 characters instead of cutting them rigidly?',
    options: [
      { text: 'To artificially inflate the document token count', isCorrect: false },
      { text: 'To guarantee that critical sentences sitting right on cut boundaries are never severed in half', isCorrect: true },
      { text: 'To scramble the text so hackers cannot read it', isCorrect: false },
      { text: 'Because computer processors can only index even-numbered chunks', isCorrect: false },
    ],
    explanation: 'If a crucial fact (e.g. "He led the NLP team at Acme Corp") sits right at character 600, a rigid cut splits the sentence into two incomplete fragments. The 100-character sliding overlap ensures the complete thought is preserved in full in at least one chunk!',
  },
  {
    id: '3',
    category: 'Deep Learning & Embeddings',
    emoji: '🧠',
    question: 'What does an embedding model like all-MiniLM-L6-v2 actually do to words?',
    options: [
      { text: 'It translates the document into 5 different foreign languages', isCorrect: false },
      { text: 'It converts sentences into a 384-dimensional GPS coordinate of meaning', isCorrect: true },
      { text: 'It encrypts text into an unreadable password file', isCorrect: false },
      { text: 'It deletes all vowels to compress file size', isCorrect: false },
    ],
    explanation: 'Computers cannot calculate the semantic meaning of raw English letters. An embedding model projects text into a 384-dimensional geometric space where concepts with similar meanings ("doctor" and "surgeon") point in virtually the same direction!',
  },
  {
    id: 4,
    category: 'Similarity Retrieval',
    emoji: '📡',
    question: 'Why do we use Cosine Similarity instead of traditional Keyword (Ctrl+F) search?',
    options: [
      { text: 'Keyword search is too fast and overheats the CPU', isCorrect: false },
      { text: 'Cosine Similarity matches semantic intent and synonyms (e.g. "coder" matches "software engineer"), which keyword search completely misses', isCorrect: true },
      { text: 'Cosine Similarity is only designed for high school trigonometry homework', isCorrect: false },
      { text: 'Keyword search is blocked by modern web browser security', isCorrect: false },
    ],
    explanation: 'Keyword search is blind to synonyms. If your document says "employment history" and the user searches for "job experience", keyword search finds 0 results! Cosine similarity compares geometric angles, matching concepts regardless of phrasing.',
  },
  {
    id: 5,
    category: 'Generation & Grounding',
    emoji: '🛡️',
    question: 'How does RAG guarantee that the LLM answer is truthful and eliminates hallucinations?',
    options: [
      { text: 'By forcing the computer to generate text at a slower typing speed', isCorrect: false },
      { text: 'By strictly constraining the prompt to only use facts from [1] and [2] and requiring inline clickable citations', isCorrect: true },
      { text: 'By shutting down the computer if an AI error is detected', isCorrect: false },
      { text: 'By asking the user to retype their prompt three times', isCorrect: false },
    ],
    explanation: 'By turning generation into an "open-book exam" with verified context chunks, setting low temperature (0.2), and requiring bracketed inline citation chips [1] and [2], the model is strictly prevented from inventing ungrounded facts.',
  },
];

export default function RagKnowledgeQuiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const q = QUESTIONS[currentIdx];
  const selectedOptionIdx = selectedAnswers[currentIdx];
  const isAnswered = selectedOptionIdx !== undefined;

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    const isCorrect = q.options[idx].isCorrect;
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: idx }));
    setShowExplanation(true);
    if (isCorrect) {
      playSuccessChime();
    }
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setQuizFinished(true);
      playSuccessChime();
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setQuizFinished(false);
  };

  // Calculate score
  const totalCorrect = Object.entries(selectedAnswers).filter(([qIdx, optIdx]) => {
    return QUESTIONS[qIdx]?.options[optIdx]?.isCorrect;
  }).length;

  return (
    <div className="quiz-container glass">
      {/* Quiz Header */}
      <div className="quiz-header">
        <div className="quiz-badge-wrap">
          <span className="quiz-badge">🧠 KNOWLEDGE CHALLENGE</span>
          <span className="quiz-score-tag">
            Question {currentIdx + 1} of {QUESTIONS.length}
          </span>
        </div>
        <h3 className="quiz-main-title">Test Your RAG Architecture Mastery</h3>
        <p className="quiz-subtitle">
          Consolidate your knowledge on chunking, vector geometry, embeddings, and prompt grounding.
        </p>
      </div>

      {!quizFinished ? (
        <div className="quiz-card glass">
          {/* Question Banner */}
          <div className="question-banner">
            <span className="q-emoji">{q.emoji}</span>
            <div className="q-text-wrap">
              <span className="q-category">{q.category}</span>
              <h4 className="q-title">{q.question}</h4>
            </div>
          </div>

          {/* Options List */}
          <div className="options-grid">
            {q.options.map((opt, i) => {
              let btnClass = 'option-btn';
              if (isAnswered) {
                if (opt.isCorrect) btnClass += ' correct';
                else if (selectedOptionIdx === i) btnClass += ' wrong';
                else btnClass += ' dimmed';
              }

              return (
                <button
                  key={i}
                  className={btnClass}
                  onClick={() => handleSelectOption(i)}
                  disabled={isAnswered}
                >
                  <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                  <span className="option-text">{opt.text}</span>
                  {isAnswered && opt.isCorrect && <span className="option-check">✓ Correct</span>}
                  {isAnswered && selectedOptionIdx === i && !opt.isCorrect && (
                    <span className="option-cross">✕ Incorrect</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {showExplanation && (
            <div className={`explanation-box ${q.options[selectedOptionIdx]?.isCorrect ? 'pass' : 'fail'}`}>
              <div className="exp-header">
                <span>{q.options[selectedOptionIdx]?.isCorrect ? '🎉 Spot on!' : '💡 Architectural Insight:'}</span>
              </div>
              <p className="exp-text">{q.explanation}</p>
            </div>
          )}

          {/* Navigation Controls */}
          {isAnswered && (
            <div className="quiz-footer">
              <button className="quiz-next-btn" onClick={handleNext}>
                {currentIdx < QUESTIONS.length - 1 ? 'Next Question ▶' : 'View Final Mastery Score 🏆'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Final Completion Screen */
        <div className="quiz-results-card glass">
          <div className="results-trophy">🏆</div>
          <h3 className="results-title">Challenge Completed!</h3>
          <p className="results-score">
            You scored <strong>{totalCorrect}</strong> out of <strong>{QUESTIONS.length}</strong> ({Math.round((totalCorrect / QUESTIONS.length) * 100)}%)
          </p>

          <div className="mastery-badge-box">
            {totalCorrect === 5 ? (
              <div className="badge-item gold">
                <span className="b-icon">🥇</span>
                <div>
                  <strong>Master of RAG Architecture</strong>
                  <p>You have a complete grasp of sliding chunking, ONNX embeddings, cosine geometry, and grounded prompt engineering!</p>
                </div>
              </div>
            ) : totalCorrect >= 3 ? (
              <div className="badge-item silver">
                <span className="b-icon">🥈</span>
                <div>
                  <strong>Solid Practitioner</strong>
                  <p>Great job! You understand the foundational mechanics of semantic search and vector retrieval.</p>
                </div>
              </div>
            ) : (
              <div className="badge-item bronze">
                <span className="b-icon">📚</span>
                <div>
                  <strong>Knowledge Explorer</strong>
                  <p>Review the Animated Story Theater and Step-by-Step guides to deepen your mental models!</p>
                </div>
              </div>
            )}
          </div>

          <button className="quiz-reset-btn" onClick={handleReset}>
            🔄 Retake Challenge
          </button>
        </div>
      )}
    </div>
  );
}
