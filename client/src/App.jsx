import { useState, useEffect } from 'react';
import { useEmbedWorker } from './hooks/useEmbedWorker.js';
import { usePipeline } from './hooks/usePipeline.js';
import { useQuery } from './hooks/useQuery.js';
import { useStatus } from './hooks/useStatus.js';
import Header from './components/Header.jsx';
import UploadZone from './components/pipeline/UploadZone.jsx';
import PipelinePanel from './components/pipeline/PipelinePanel.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import XRayPanel from './components/xray/XRayPanel.jsx';
import VectorMap from './components/map/VectorMap.jsx';
import SettingsPanel from './components/settings/SettingsPanel.jsx';
import RagExplainer from './components/learn/RagExplainer.jsx';
import ApiBudget from './components/settings/ApiBudget.jsx';
import './styles/app.css';

export default function App() {
  const [settings, setSettings] = useState({
    provider: 'auto',
    topK: 4,
    chunkSize: 600,
    chunkOverlap: 100,
    batchSize: 8,
    rerankerEnabled: false,
    neverSendToCloud: false,
  });

  const [showSettings, setShowSettings] = useState(false);

  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (['chat', 'map', 'xray', 'learn'].includes(hash)) return hash;
    }
    return 'chat';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync tab with URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (['chat', 'map', 'xray', 'learn'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeTab = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = `#${tab}`;
    }
  };

  const { status, refresh: refreshStatus } = useStatus();
  const { status: workerStatus, progress: workerProgress, embed, embedSentences, enableReranker, retry } = useEmbedWorker();

  const {
    stageState, chunks: indexedChunks, embeddings, umapPoints,
    docMeta, docList, error: pipelineError, progress: pipelineProgress,
    runIngestion, removeDoc, cancel: cancelIngestion,
  } = usePipeline({ embed });

  // Indexed as soon as at least one document has been committed
  const isIndexed = docList.length > 0;
  const isIngesting = stageState[7] !== 'done' && Object.values(stageState).some(s => s === 'active');

  const effectiveSettings = settings.neverSendToCloud
    ? { ...settings, provider: 'extractive' }
    : settings;

  const {
    isStreaming, answer, chunks: resultChunks, providerPath, activeProvider,
    usage, mode, extractiveSentences, timing, error: queryError,
    history, ask, stop, clearHistory,
  } = useQuery({ embed, embedSentences, settings: effectiveSettings });

  // Accept an array of files and process them sequentially
  const handleFiles = async (files) => {
    for (const file of files) {
      await runIngestion(file, {
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap,
        batchSize: settings.batchSize,
      });
    }
    refreshStatus();
  };

  const handleRerankerToggle = (enabled) => {
    setSettings(s => ({ ...s, rerankerEnabled: enabled }));
    enableReranker(enabled);
  };

  return (
    <div className="app-layout">
      <Header
        workerStatus={workerStatus}
        workerProgress={workerProgress}
        onSettingsClick={() => setShowSettings(s => !s)}
        showSettings={showSettings}
      />

      <main className="app-main">
        {/* Left: Upload + Pipeline */}
        <aside className="app-sidebar">
          <UploadZone
            onFiles={handleFiles}
            onRemoveDoc={removeDoc}
            docList={docList}
            currentDocMeta={isIngesting ? docMeta : null}
            disabled={workerStatus !== 'ready'}
            workerStatus={workerStatus}
            workerProgress={workerProgress}
            onRetry={retry}
          />
          <PipelinePanel
            stageState={stageState}
            progress={pipelineProgress}
            error={pipelineError}
            onCancel={cancelIngestion}
            docMeta={docMeta}
          />
          <ApiBudget status={status} />
        </aside>

        {/* Center: tabs */}
        <section className="app-center">
          <div className="tab-bar">
            {['chat', 'map', 'xray', 'learn'].map(tab => (
              <button
                key={tab}
                id={`tab-${tab}`}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => changeTab(tab)}
              >
                {tab === 'chat' ? '💬 Chat' : tab === 'map' ? '🗺️ Vector Map' : tab === 'xray' ? '🔬 X-Ray' : '🎓 Learn RAG'}
              </button>
            ))}
          </div>

          {activeTab === 'chat' && (
            <ChatPanel
              isIndexed={isIndexed}
              isStreaming={isStreaming}
              answer={answer}
              mode={mode}
              activeProvider={activeProvider}
              extractiveSentences={extractiveSentences}
              timing={timing}
              error={queryError}
              resultChunks={resultChunks}
              history={history}
              neverSendToCloud={settings.neverSendToCloud}
              onAsk={ask}
              onStop={stop}
              onClearHistory={clearHistory}
              status={status}
            />
          )}

          {activeTab === 'map' && (
            <VectorMap
              points={umapPoints}
              embeddings={embeddings}
              chunks={indexedChunks}
              resultChunks={resultChunks}
              stageState={stageState}
            />
          )}

          {activeTab === 'xray' && (
            <XRayPanel
              stageState={stageState}
              providerPath={providerPath}
              mode={mode}
              activeProvider={activeProvider}
              extractiveSentences={extractiveSentences}
              resultChunks={resultChunks}
              usage={usage}
              timing={timing}
              pipelineProgress={pipelineProgress}
            />
          )}

          {activeTab === 'learn' && <RagExplainer />}
        </section>
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          status={status}
          onRerankerToggle={handleRerankerToggle}
        />
      )}
    </div>
  );
}
