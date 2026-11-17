// Build with React 19, @alfalab/core-components-tabs 10.1.8 and esbuild.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PrimaryTabListMobile } from '@alfalab/core-components-tabs/esm/components/primary-tablist/Component.mobile.js';
import '@alfalab/core-components-tabs/components/primary-tablist/index.css';
import '@alfalab/core-components-tabs/components/primary-tablist/mobile.css';
function TaskTabs() {
  const [selectedId, setSelectedId] = useState('tasks');
  const select = id => {
    setSelectedId(id);
    for (const name of ['tasks', 'rewards']) document.getElementById(`${name}-panel`).hidden = name !== id;
  };
  React.useEffect(() => {
    const button = document.querySelector('[data-tasks-return]');
    const back = () => { select('tasks'); requestAnimationFrame(() => document.getElementById('tasks').focus()); };
    button.addEventListener('click', back);
    return () => button.removeEventListener('click', back);
  }, []);
  return <PrimaryTabListMobile selectedId={selectedId} scrollable={false}
    className="prototype-alfa-tablist" textStyle="paragraph-primary-large"
    titles={[{id:'tasks',title:'Задания',titleProps:{'aria-controls':'tasks-panel'}},{id:'rewards',title:'Мои награды',titleProps:{'aria-controls':'rewards-panel'}}]}
    onChange={(_, {selectedId:id}) => select(id)} />;
}
createRoot(document.getElementById('prototype-task-tabs')).render(<TaskTabs />);
