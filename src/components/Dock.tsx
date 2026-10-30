import type { ReactNode } from 'react';
import { addCardAtCenter, addGroup, addTextAtCenter } from '../lib/actions';
import { worldCenter } from '../lib/camera';
import { pickImages } from '../lib/media';
import { createLink, LINK_WIDTH } from '../lib/nodes';
import { useBoard } from '../store/board';
import { AddCardIcon, GroupIcon, HandIcon, ImageIcon, LinkIcon, PointerIcon, TextIcon } from './Icons';

function addLink() {
  const c = worldCenter();
  const s = useBoard.getState();
  s.setTool('select');
  s.addNode(createLink(c.x - LINK_WIDTH / 2, c.y - 24), { edit: true });
}

function DockButton({ icon, label, title, active, onClick }: { icon: ReactNode; label: string; title: string; active?: boolean; onClick: () => void }) {
  return (
    <button className={active ? 'dock-btn active' : 'dock-btn'} title={title} onClick={onClick}>
      {icon}
      <span className="dock-label">{label}</span>
    </button>
  );
}

export function Dock() {
  const tool = useBoard((s) => s.tool);
  const setTool = useBoard((s) => s.setTool);

  return (
    <div className="dock">
      <DockButton icon={<PointerIcon />} label="Select" title="Select (V)" active={tool === 'select'} onClick={() => setTool('select')} />
      <DockButton icon={<HandIcon />} label="Hand" title="Hand (H, or hold Space)" active={tool === 'hand'} onClick={() => setTool('hand')} />
      <span className="dock-sep" />
      <DockButton icon={<AddCardIcon />} label="Card" title="Add card (N)" onClick={addCardAtCenter} />
      <DockButton icon={<TextIcon />} label="Text" title="Add text (T)" onClick={addTextAtCenter} />
      <DockButton icon={<ImageIcon />} label="Image" title="Add images (or paste / drop them)" onClick={() => pickImages(worldCenter())} />
      <DockButton icon={<LinkIcon size={18} />} label="Link" title="Add a link (or paste a URL)" onClick={addLink} />
      <DockButton icon={<GroupIcon />} label="Group" title="Add group, or group the selection (Ctrl G)" onClick={addGroup} />
    </div>
  );
}
