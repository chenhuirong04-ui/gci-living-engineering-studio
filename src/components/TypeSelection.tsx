import React from 'react';
import { Ruler, Package, Upload } from 'lucide-react';
import { StepIndicator } from './StepIndicator';

export type QuoteType = 'custom' | 'package' | 'upload';

interface TypeCard {
  type: QuoteType;
  icon: React.FC<{ className?: string }>;
  title: string;
  titleZh: string;
  tag: string;
  description: string;
  descriptionZh: string;
  examples: string[];
}

const CARDS: TypeCard[] = [
  {
    type: 'custom',
    icon: Ruler,
    title: 'Custom Item Quote',
    titleZh: '单品定制报价',
    tag: 'Path 1',
    description: 'Quote a single custom-made furniture item.',
    descriptionZh: '为单一定制产品生成工程报价',
    examples: ['Bed / 床', 'Sofa / 沙发', 'Wardrobe / 衣柜', 'Cabinet / 储物柜', 'Table / 桌子'],
  },
  {
    type: 'package',
    icon: Package,
    title: 'Project Package Quote',
    titleZh: '整套项目报价',
    tag: 'Path 2',
    description: 'Quote a full furniture set for a project environment.',
    descriptionZh: '按场景配置整套家具，生成项目包报价',
    examples: ['Labour Camp / 营地', 'Hotel / 酒店', 'Villa / 别墅', 'Apartment / 公寓', 'Office / 办公室'],
  },
  {
    type: 'upload',
    icon: Upload,
    title: 'Supplier Quote Upload',
    titleZh: '供应商报价上传',
    tag: 'Path 3',
    description: 'Upload supplier cost data — AI parses and builds a draft for you to review and mark up.',
    descriptionZh: '上传供应商报价，AI 自动解析生成草稿，加利润后生成客户报价',
    examples: ['Excel / CSV', 'PDF', 'Image / 图片', 'Text paste / 手工文本'],
  },
];

interface TypeSelectionProps {
  onSelect: (type: QuoteType) => void;
  onBack: () => void;
  projectName: string;
}

export const TypeSelection: React.FC<TypeSelectionProps> = ({ onSelect, onBack, projectName }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
    <StepIndicator current={2} />

    {/* Header */}
    <div className="text-center space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9A84C]">
        {projectName}
      </p>
      <h2 className="text-3xl font-serif italic text-[#0C1B3A]">Choose Quote Type</h2>
      <p className="text-xs text-[#0C1B3A]/50 font-medium">
        Select the path that matches your current task
      </p>
    </div>

    {/* Path Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.type}
            onClick={() => onSelect(card.type)}
            className="group text-left p-8 bg-white border-2 border-[#0C1B3A]/8 rounded-[32px] hover:border-[#C9A84C] hover:shadow-2xl hover:-translate-y-1 transition-all duration-400 flex flex-col gap-5"
          >
            {/* Tag */}
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded-full">
                {card.tag}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#0C1B3A]/5 group-hover:bg-[#C9A84C]/10 flex items-center justify-center transition-colors">
                <Icon className="w-5 h-5 text-[#0C1B3A]/40 group-hover:text-[#C9A84C] transition-colors" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-base font-black text-[#0C1B3A] leading-tight group-hover:text-[#C9A84C] transition-colors">
                {card.title}
              </h3>
              <p className="text-[10px] text-[#0C1B3A]/40 font-bold mt-0.5">{card.titleZh}</p>
            </div>

            {/* Description */}
            <p className="text-[11px] text-[#0C1B3A]/60 leading-relaxed flex-1">
              {card.description}
              <br />
              <span className="text-[#0C1B3A]/35">{card.descriptionZh}</span>
            </p>

            {/* Examples */}
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {card.examples.map(ex => (
                <span key={ex} className="text-[9px] font-bold text-[#0C1B3A]/40 bg-[#0C1B3A]/4 px-2 py-0.5 rounded-full">
                  {ex}
                </span>
              ))}
            </div>

            {/* CTA arrow */}
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity">
              Select this path →
            </div>
          </button>
        );
      })}
    </div>

    {/* Back */}
    <div className="flex justify-center pt-2">
      <button
        onClick={onBack}
        className="text-[10px] font-black uppercase tracking-widest text-[#0C1B3A]/30 hover:text-[#0C1B3A] transition-colors flex items-center gap-2"
      >
        ← Back to Project Info
      </button>
    </div>
  </div>
);
