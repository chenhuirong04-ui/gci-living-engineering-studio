import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ChevronRight, 
  ChevronLeft, 
  Package, 
  Ruler, 
  Layers, 
  Square, 
  Palette, 
  PlusCircle, 
  FileText,
  Printer,
  Download,
  Settings,
  X,
  CreditCard,
  Building2,
  Home,
  Building,
  Briefcase,
  Tv,
  Utensils,
  Armchair,
  Columns,
  Archive,
  Trello,
  MousePointer2,
  Layout,
  Bed,
  ArrowLeft,
  Zap,
  Maximize,
  Anchor,
  Languages,
  Plus,
  Trash2,
  Edit2,
  Copy,
  History,
  Menu,
  FileSpreadsheet,
  RefreshCw,
  Split,
  Info,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Upload,
  Clipboard,
  Image as ImageIcon
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { translations, Language } from './translations';
import { StepIndicator } from './components/StepIndicator';
import { TypeSelection, QuoteType } from './components/TypeSelection';
import { 
  BedSize, 
  SIZE_DIMENSIONS,
  Material, 
  Thickness, 
  THICKNESS_FACTORS,
  FrameType, 
  FRAME_TYPE_COSTS,
  HeadboardType, 
  FinishType, 
  Color, 
  AddOn, 
  ADDON_COSTS_BASE,
  BedConfiguration,
  BOMItem,
  MaterialPrices,
  DEFAULT_PRICES,
  FIXED_COST_CONFIG,
  Scenario,
  FurnitureCategory,
  GenericConfiguration,
  SofaFrameType,
  SofaCushionType,
  SofaUpholsteryType,
  SofaConfiguration,
  QuoteRecord,
  PackageItem,
  SCENARIO_RECOMMENDATIONS,
  SOFA_FRAME_COSTS,
  SOFA_CUSHION_COSTS,
  SOFA_UPHOLSTERY_COSTS,
  ChairType,
  LegType,
  BackrestType,
  SeatType,
  ArmrestType,
  TableShape,
  TableBaseType,
  EdgeTreatment,
  DoorType,
  InternalLayout,
  HandleType,
  CabinetType,
  MountingType,
  WardrobeType,
  TVUnitType,
  ChairConfiguration,
  DiningTableConfiguration,
  WardrobeConfiguration,
  CabinetConfiguration,
  TVUnitConfiguration,
  HingeType,
  RunnerType,
  CabinetModuleType,
  CabinetModule,
  ModularCabinetConfiguration
} from './constants';

const CHAIR_STEPS = [
  { id: 'dimensions', title: 'Size', icon: Ruler },
  { id: 'type', title: 'Chair Type', icon: Layout },
  { id: 'frame', title: 'Frame Material', icon: Square },
  { id: 'legs', title: 'Leg Type', icon: Columns },
  { id: 'backrest', title: 'Backrest', icon: Layers },
  { id: 'seat', title: 'Seat', icon: Archive },
  { id: 'upholstery', title: 'Upholstery', icon: Palette },
  { id: 'armrest', title: 'Armrest', icon: Trello },
  { id: 'finish', title: 'Finish', icon: Palette },
  { id: 'color', title: 'Color', icon: Palette },
  { id: 'addons', title: 'Add-ons', icon: PlusCircle },
  { id: 'summary', title: 'BOM & Quote', icon: FileText },
];

const DINING_TABLE_STEPS = [
  { id: 'dimensions', title: 'Size', icon: Ruler },
  { id: 'shape', title: 'Shape', icon: Layout },
  { id: 'material', title: 'Top Material', icon: Layers },
  { id: 'legs', title: 'Base/Legs', icon: Columns },
  { id: 'edge', title: 'Edge', icon: Ruler },
  { id: 'finish', title: 'Finish', icon: Palette },
  { id: 'color', title: 'Color', icon: Palette },
  { id: 'summary', title: 'BOM & Quote', icon: FileText },
];

const SOFA_STEPS = [
  { id: 'dimensions', title: 'Size', icon: Ruler },
  { id: 'material', title: 'Foam', icon: Layers },
  { id: 'frame', title: 'Frame', icon: Square },
  { id: 'finish', title: 'Upholstery', icon: Palette },
  { id: 'color', title: 'Color', icon: Palette },
  { id: 'addons', title: 'Add-ons', icon: PlusCircle },
  { id: 'summary', title: 'BOM & Quote', icon: FileText },
];

const MODULAR_STORAGE_STEPS = [
  { id: 'modules', title: 'Modules', icon: Layout },
  { id: 'summary', title: 'BOM & Quote', icon: FileText },
];

const BED_STEPS = [
  { id: 'size', title: 'Size', icon: Ruler },
  { id: 'material', title: 'Raw Materials', icon: Layers },
  { id: 'frame', title: 'Structure', icon: Square },
  { id: 'finish', title: 'Aesthetics', icon: Palette },
  { id: 'color', title: 'Color', icon: Palette },
  { id: 'addons', title: 'Add-ons', icon: PlusCircle },
  { id: 'summary', title: 'BOM & Quote', icon: FileText },
];

interface DraftItem {
  id: string;
  originalName: string;
  originalSpec: string;
  suggestedCategory: FurnitureCategory | 'unknown';
  quantity: number;
  unit: string;
  targetUnitPrice: number;
  targetTotal: number;
  confidence: number;
  status: 'Confirmed' | 'Need Review' | 'Need Split' | 'Need Configuration';
  isSplittable?: boolean;
  specOverride?: string;
  notes?: string;
}

const SOFA_TYPES = [
  '1-seater',
  '2-seater',
  '3-seater',
  'L-shape',
  'Custom size',
  'Other'
];

export default function App() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FurnitureCategory | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [prices, setPrices] = useState<MaterialPrices>(DEFAULT_PRICES);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<'configurator' | 'history'>('configurator');
  // Read URL params injected by DEAL (client, project, salesperson, businessId, returnUrl)
  const _urlParams = new URLSearchParams(window.location.search);
  const _clientParam = _urlParams.get('client') || '';
  const _projectParam = _urlParams.get('project') || '';
  const _salespersonParam = _urlParams.get('salesperson') || '';
  const _businessIdParam = _urlParams.get('businessId') || '';
  const _returnUrlParam = _urlParams.get('returnUrl') || '';
  const _prefillName = _clientParam && _projectParam
    ? `${_clientParam} - ${_projectParam}`
    : _clientParam || _projectParam;

  const [projectInfoSubmitted, setProjectInfoSubmitted] = useState(!!_prefillName);
  const [quoteMode, setQuoteMode] = useState<'single' | 'package' | null>(null);
  const [quoteType, setQuoteType] = useState<QuoteType | null>(null);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'draft'>('items');
  const [importText, setImportText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [rawExcelData, setRawExcelData] = useState<any[][] | null>(null);
  const [excelMappings, setExcelMappings] = useState<Record<string, number>>({});
  const [showMapping, setShowMapping] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [itemToSplit, setItemToSplit] = useState<DraftItem | null>(null);
  const [splitResult, setSplitResult] = useState<DraftItem[]>([]);
  const [validationError, setValidationError] = useState('');
  
  // Cost Overrides
  const [costOverrides, setCostOverrides] = useState({
    labor: DEFAULT_PRICES.labor,
    packaging: DEFAULT_PRICES.packaging,
    transport: DEFAULT_PRICES.transport,
    installation: DEFAULT_PRICES.installation,
    marginPercent: DEFAULT_PRICES.marginPercent,
    vatPercent: DEFAULT_PRICES.vatPercent,
  });

  const language: Language = 'bilingual'; // Fixed UI language

  const generateQuoteNumber = (history: QuoteRecord[]) => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                    (today.getMonth() + 1).toString().padStart(2, '0') + 
                    (today.getDate()).toString().padStart(2, '0');
    
    const todayQuotes = history.filter(q => q.quoteNumber.startsWith(`GCI-${dateStr}`));
    const nextNum = (todayQuotes.length + 1).toString().padStart(3, '0');
    
    return `GCI-${dateStr}-${nextNum}`;
  };

  const [quoteInfo, setQuoteInfo] = useState({
    customerProjectName: _prefillName,
    phoneWhatsApp: '',
    salesperson: _salespersonParam,
    quoteNumber: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [quoteHistory, setQuoteHistory] = useState<QuoteRecord[]>([]);
  
  const STEPS = useMemo(() => {
    switch (selectedCategory) {
      case FurnitureCategory.BED: return BED_STEPS;
      case FurnitureCategory.SOFA: return SOFA_STEPS;
      case FurnitureCategory.CHAIR: return CHAIR_STEPS;
      case FurnitureCategory.DINING_TABLE: return DINING_TABLE_STEPS;
      case FurnitureCategory.WARDROBE:
      case FurnitureCategory.CABINET:
      case FurnitureCategory.TV_UNIT:
        return MODULAR_STORAGE_STEPS;
      case FurnitureCategory.TABLE_DESK:
        return MODULAR_STORAGE_STEPS;
      default: return BED_STEPS;
    }
  }, [selectedCategory]);

  const [config, setConfig] = useState<BedConfiguration>({
    size: BedSize.QUEEN,
    width: 1600,
    length: 2000,
    height: 350,
    headboardHeight: 1100,
    material: Material.MDF,
    thickness: Thickness.T18,
    frame: FrameType.SLATS,
    headboard: HeadboardType.WOODEN,
    finish: FinishType.MELAMINE,
    color: Color.WHITE,
    addOns: [],
  });

  const [genericConfig, setGenericConfig] = useState<GenericConfiguration>({
    width: 1200,
    length: 600,
    height: 750,
    material: Material.MDF,
    thickness: Thickness.T18,
    finish: FinishType.MELAMINE,
    color: Color.WHITE,
    frameType: FrameType.SLATS,
    addOns: [],
  });

  const [sofaConfig, setSofaConfig] = useState<SofaConfiguration>({
    sofaType: '3-Seater',
    length: 2200,    // Overall length
    depth: 900,
    seatHeight: 450,
    backHeight: 850,
    frameType: SofaFrameType.SOLID_WOOD,
    cushionType: SofaCushionType.HIGH_DENSITY,
    upholsteryType: SofaUpholsteryType.FABRIC,
    legs: 'Wooden legs',
    armrest: 'Wide upholstered armrest',
    color: Color.BEIGE,
    addOns: [],
  });

  const [chairConfig, setChairConfig] = useState<ChairConfiguration>({
    type: ChairType.DINING,
    width: 550,
    depth: 580,
    seatHeight: 450,
    backHeight: 850,
    frameMaterial: Material.SOLID_WOOD,
    legType: LegType.WOODEN,
    backrest: BackrestType.UPHOLSTERED,
    seat: SeatType.HIGH_DENSITY,
    upholstery: SofaUpholsteryType.FABRIC,
    armrest: ArmrestType.NONE,
    finish: FinishType.VENEER,
    color: Color.BEIGE,
    addOns: [],
  });

  const [diningTableConfig, setDiningTableConfig] = useState<DiningTableConfiguration>({
    shape: TableShape.RECTANGULAR,
    topMaterial: Material.SOLID_WOOD,
    thickness: Thickness.T25,
    baseType: TableBaseType.WOODEN,
    edge: EdgeTreatment.ROUNDED,
    length: 2000,
    width: 1000,
    height: 750,
    finish: FinishType.VENEER,
    color: Color.WALNUT,
  });

  const [wardrobeConfig, setWardrobeConfig] = useState<WardrobeConfiguration>({
    doorType: DoorType.SWING,
    material: Material.PLYWOOD,
    thickness: Thickness.T18,
    layout: InternalLayout.STANDARD,
    handle: HandleType.EXTERNAL,
    width: 1800,
    height: 2400,
    depth: 600,
    doorCount: 4,
    finish: FinishType.MELAMINE,
    color: Color.WHITE,
    addOns: [],
  });

  const [cabinetConfig, setCabinetConfig] = useState<CabinetConfiguration>({
    type: CabinetType.STORAGE,
    material: Material.MDF,
    doorType: DoorType.SWING,
    hasDrawers: true,
    drawerDoorCount: 4,
    handle: HandleType.HIDDEN,
    width: 1200,
    height: 900,
    depth: 450,
    finish: FinishType.MELAMINE,
    color: Color.GREY,
    addOns: [],
  });

  const [tvUnitConfig, setTVUnitConfig] = useState<TVUnitConfiguration>({
    mounting: MountingType.FLOOR,
    material: Material.MDF,
    width: 2000,
    height: 450,
    depth: 400,
    hasDrawers: true,
    finish: FinishType.PAINTED,
    color: Color.WALNUT,
    addOns: [],
  });

  const [modularConfig, setModularConfig] = useState<ModularCabinetConfiguration>({
    modules: []
  });

  const [editingModule, setEditingModule] = useState<CabinetModule | null>(null);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);

  // Sync dimensions when size changes
  useEffect(() => {
    if (config.size !== BedSize.CUSTOM) {
      const dims = SIZE_DIMENSIONS[config.size];
      setConfig(prev => ({ ...prev, width: dims.w, length: dims.l }));
    }
  }, [config.size]);

  useEffect(() => {
    const saved = localStorage.getItem('gci_quote_history');
    if (saved) {
      try {
        const history = JSON.parse(saved);
        setQuoteHistory(history);
        // Initialize quote number based on loaded history
        setQuoteInfo(prev => ({
          ...prev,
          quoteNumber: generateQuoteNumber(history)
        }));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    } else {
      setQuoteInfo(prev => ({
        ...prev,
        quoteNumber: generateQuoteNumber([])
      }));
    }
  }, []);

  const resetProject = () => {
    setSelectedScenario(null);
    setSelectedCategory(null);
    setProjectInfoSubmitted(false);
    setQuoteMode(null);
    setQuoteType(null);
    setPackageItems([]);
    setCurrentStep(0);
    setCostOverrides({
      labor: DEFAULT_PRICES.labor,
      packaging: DEFAULT_PRICES.packaging,
      transport: DEFAULT_PRICES.transport,
      installation: DEFAULT_PRICES.installation,
      marginPercent: DEFAULT_PRICES.marginPercent,
      vatPercent: DEFAULT_PRICES.vatPercent,
    });
    setQuoteInfo(prev => ({
      customerProjectName: '',
      phoneWhatsApp: '',
      salesperson: prev.salesperson, // Keep salesperson
      quoteNumber: generateQuoteNumber(quoteHistory),
      date: new Date().toISOString().split('T')[0]
    }));
  };

  const addToPackage = () => {
    const currentConfig = 
      selectedCategory === FurnitureCategory.BED ? { ...config } :
      selectedCategory === FurnitureCategory.SOFA ? { ...sofaConfig } :
      selectedCategory === FurnitureCategory.CHAIR ? { ...chairConfig } :
      selectedCategory === FurnitureCategory.DINING_TABLE ? { ...diningTableConfig } :
      selectedCategory === FurnitureCategory.WARDROBE ? { ...wardrobeConfig } :
      selectedCategory === FurnitureCategory.CABINET ? { ...cabinetConfig } :
      selectedCategory === FurnitureCategory.TV_UNIT ? { ...tvUnitConfig } :
      { ...genericConfig };

    const newItem: PackageItem = {
      id: Math.random().toString(36).substring(2, 9),
      category: selectedCategory!,
      config: currentConfig,
      quantity: 1,
      bom: [...bom],
      totalAmount: costs.total
    };
    setPackageItems(prev => [...prev, newItem]);
    setSelectedCategory(null);
    setCurrentStep(0);
  };

  const restoreQuote = (quote: QuoteRecord) => {
    setSelectedCategory(quote.category);
    setSelectedScenario(quote.scenario || null);
    setQuoteInfo({
      customerProjectName: quote.customerProjectName,
      phoneWhatsApp: quote.phoneWhatsApp || '',
      quoteNumber: quote.quoteNumber,
      salesperson: quote.salesperson,
      date: quote.date
    });
    setProjectInfoSubmitted(true);
    
    if (quote.category === FurnitureCategory.BED) setConfig(quote.config as BedConfiguration);
    else if (quote.category === FurnitureCategory.SOFA) setSofaConfig(quote.config as SofaConfiguration);
    else if (quote.category === FurnitureCategory.CHAIR) setChairConfig(quote.config as ChairConfiguration);
    else if (quote.category === FurnitureCategory.DINING_TABLE) setDiningTableConfig(quote.config as DiningTableConfiguration);
    else if (quote.category === FurnitureCategory.WARDROBE) setWardrobeConfig(quote.config as WardrobeConfiguration);
    else if (quote.category === FurnitureCategory.CABINET) setCabinetConfig(quote.config as CabinetConfiguration);
    else if (quote.category === FurnitureCategory.TV_UNIT) setTVUnitConfig(quote.config as TVUnitConfiguration);
    else setGenericConfig(quote.config as GenericConfiguration);

    if (quote.costOverrides) {
      setCostOverrides(quote.costOverrides);
    }
    setCurrentStep(STEPS.length - 1);
    setView('configurator');
  };

  const saveToHistory = () => {
    if (!selectedCategory) return;
    if (!quoteInfo.customerProjectName) {
      alert('请输入客户/项目名称 Please enter Customer / Project Name');
      return;
    }
    
    const currentConfig = 
      selectedCategory === FurnitureCategory.BED ? config :
      selectedCategory === FurnitureCategory.SOFA ? sofaConfig :
      selectedCategory === FurnitureCategory.CHAIR ? chairConfig :
      selectedCategory === FurnitureCategory.DINING_TABLE ? diningTableConfig :
      selectedCategory === FurnitureCategory.WARDROBE ? wardrobeConfig :
      selectedCategory === FurnitureCategory.CABINET ? cabinetConfig :
      selectedCategory === FurnitureCategory.TV_UNIT ? tvUnitConfig :
      genericConfig;

    const newRecord: QuoteRecord = {
      id: Date.now().toString(),
      ...quoteInfo,
      category: selectedCategory,
      scenario: selectedScenario || undefined,
      totalAmount: costs.total,
      config: currentConfig,
      bom: bom,
      costOverrides: costOverrides
    };
    const updated = [newRecord, ...quoteHistory];
    setQuoteHistory(updated);
    localStorage.setItem('gci_quote_history', JSON.stringify(updated));
    alert('报价已保存至历史记录 Saved to history');
  };

  // Handle 3-path type selection (Step 2)
  const handleTypeSelect = (type: QuoteType) => {
    setQuoteType(type);
    if (type === 'package') {
      setQuoteMode('package');
      setActiveTab('items');
    } else if (type === 'upload') {
      setQuoteMode('package');
      setActiveTab('draft');
    } else {
      setQuoteMode(null); // 'custom' — let category selection drive quoteMode
    }
  };

  const sendToTrade = () => {
    if (!quoteInfo.customerProjectName) {
      alert('请先填写客户/项目名称 Please enter Customer / Project Name');
      return;
    }
    const isPackage = quoteMode === 'package';

    // Build pre-VAT item list for TRADE (TRADE auto-adds 5% VAT)
    const tradeItems = isPackage
      ? packageItems.map(pkg => ({
          desc: `${pkg.category} × ${pkg.quantity}`,
          qty: pkg.quantity,
          // totalAmount includes VAT, so divide by 1+vatPercent to get pre-VAT unit price
          unitPrice: Number((pkg.totalAmount / (1 + costOverrides.vatPercent / 100)).toFixed(2)),
          lineTotal: Number(((pkg.totalAmount / (1 + costOverrides.vatPercent / 100)) * pkg.quantity).toFixed(2)),
        }))
      : [{
          desc: `${selectedCategory} Project | ${quoteInfo.quoteNumber || 'Draft'}`,
          qty: 1,
          unitPrice: Number((costs.total - costs.vat).toFixed(2)),
          lineTotal: Number((costs.total - costs.vat).toFixed(2)),
        }];

    const totalBeforeVat = isPackage
      ? packageItems.reduce((acc, pkg) => acc + pkg.totalAmount / (1 + costOverrides.vatPercent / 100) * pkg.quantity, 0)
      : costs.total - costs.vat;
    const vatAmt = isPackage
      ? packageItems.reduce((acc, pkg) => acc + pkg.totalAmount, 0) - totalBeforeVat
      : costs.vat;
    const totalAmt = isPackage
      ? packageItems.reduce((acc, pkg) => acc + pkg.totalAmount * pkg.quantity, 0)
      : costs.total;
    const costAmt = isPackage ? 0 : Number((costs.material + costs.labor + costs.packaging + costs.transport + costs.installation).toFixed(2));
    const profitAmt = isPackage ? 0 : Number(costs.margin.toFixed(2));

    const payload = {
      customerName: quoteInfo.customerProjectName,
      projectName: quoteInfo.customerProjectName,
      quoteNo: quoteInfo.quoteNumber || `GCI-DRAFT-${Date.now()}`,
      quoteDate: quoteInfo.date,
      currency: 'AED',
      subtotal: Number(totalBeforeVat.toFixed(2)),
      vatAmount: Number(vatAmt.toFixed(2)),
      totalAmount: Number(totalAmt.toFixed(2)),
      marginRate: costOverrides.marginPercent,
      costAmount: costAmt,
      profitAmount: profitAmt,
      items: tradeItems,
      sourceApp: 'gci-living-engineering-studio',
      piType: 'PROJECT',
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    window.open(`https://trade.globalcareinfo.com/?inbound=${encoded}&tab=quote`, '_blank');
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const brandGold: [number, number, number] = [212, 175, 55]; // #D4AF37
    const brandBrown: [number, number, number] = [62, 39, 35]; // #3E2723
    
    const margin = 15;
    let yPos = 20;

    // Header
    doc.setFillColor(brandBrown[0], brandBrown[1], brandBrown[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('GCI LIVING', margin, 25);
    
    doc.setFontSize(10);
    const quoteTitle = tPDF('QUOTATION');
    const quoteTitleWidth = doc.getTextWidth(quoteTitle);
    doc.text(quoteTitle, 210 - margin - quoteTitleWidth, 25);

    yPos = 50;

    // Quotation Info
    doc.setTextColor(brandBrown[0], brandBrown[1], brandBrown[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tPDF('Quotation No.')}: ${quoteInfo.quoteNumber}`, margin, yPos);
    
    const dateStr = `${tPDF('Date')}: ${new Date(quoteInfo.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    const dateWidth = doc.getTextWidth(dateStr);
    doc.text(dateStr, 210 - margin - dateWidth, yPos);

    yPos += 15;

    // Client Info
    doc.setDrawColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, 210 - margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.text(tPDF('CLIENT INFORMATION'), margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`${tPDF('Customer / Project Name')}: ${quoteInfo.customerProjectName}`, margin, yPos);
    yPos += 5;
    doc.text(`${tPDF('Phone / WhatsApp')}: ${quoteInfo.phoneWhatsApp || 'N/A'}`, margin, yPos);
    yPos += 5;
    doc.text(`${tPDF('Salesperson')}: ${quoteInfo.salesperson || 'N/A'}`, margin, yPos);

    yPos += 15;

    // Specifications
    const currentConfig = selectedCategory === FurnitureCategory.BED 
      ? config 
      : (selectedCategory === FurnitureCategory.SOFA ? sofaConfig : 
         ([FurnitureCategory.WARDROBE, FurnitureCategory.CABINET, FurnitureCategory.TV_UNIT, FurnitureCategory.TABLE_DESK].includes(selectedCategory!) ? modularConfig : genericConfig));

    doc.setFont('helvetica', 'bold');
    doc.text(tPDF('PRODUCT SPECIFICATION'), margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`${tPDF('Category')}: ${tPDF(selectedCategory!)}`, margin, yPos);
    yPos += 5;
    
    const finishKey = (currentConfig as any).finish;
    const finishLabel = finishKey ? tPDF(finishKey) : 'N/A';
    doc.text(`${tPDF('Finish')}: ${finishLabel}`, margin, yPos);
    yPos += 5;

    const colorLabel = currentConfig.color === Color.CUSTOM ? `Custom (${currentConfig.customColor || 'Pending'})` : tPDF(currentConfig.color);
    doc.text(`${tPDF('Color')}: ${colorLabel}`, margin, yPos);
    
    if (currentConfig.color === Color.CUSTOM && currentConfig.customColor) {
      yPos += 5;
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
      doc.text(`Note: ${currentConfig.customColor}`, margin, yPos);
      doc.setTextColor(brandBrown[0], brandBrown[1], brandBrown[2]);
      doc.setFont('helvetica', 'normal');
    }

    yPos += 15;

    // BOM Table
    autoTable(doc, {
      startY: yPos,
      head: [[tPDF('Component'), tPDF('Specification'), tPDF('Qty'), tPDF('Rate'), tPDF('Subtotal')]],
      body: bom.map(item => {
        const compParts = item.component.includes(':') 
          ? item.component.split(':') 
          : [item.component];
          
        return [
          tPDF(compParts[0]),
          compParts[1] ? tPDF(compParts[1].trim()) : 'Standard',
          `${item.quantity} ${tPDF(item.unit)}`,
          item.unitPrice.toLocaleString(),
          item.total.toLocaleString()
        ];
      }),
      headStyles: { fillColor: brandBrown, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 245] },
      margin: { left: margin, right: margin },
      theme: 'striped',
      didDrawPage: (data) => {
        yPos = data.cursor?.y || yPos;
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Cost summary
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    const summaryX = 130;
    doc.setFont('helvetica', 'bold');
    doc.text(tPDF('COST SUMMARY'), summaryX, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');

    const summaryItems = [
      { label: tPDF('Material'), value: costs.material },
      { label: tPDF('Labor'), value: costs.labor },
      { label: tPDF('Packaging'), value: costs.packaging },
      { label: tPDF('Transport'), value: costs.transport },
      { label: tPDF('Installation'), value: costs.installation },
      { label: tPDF('Margin Amt'), value: costs.margin },
      { label: tPDF('Net (Excl. VAT)'), value: (costs.material + costs.labor + costs.packaging + costs.transport + costs.installation + costs.margin) },
      { label: tPDF('VAT Amt'), value: costs.vat },
    ];

    summaryItems.forEach(item => {
      doc.text(item.label, summaryX, yPos);
      const val = item.value.toLocaleString();
      doc.text(val, 210 - margin - doc.getTextWidth(val), yPos);
      yPos += 5;
    });

    yPos += 5;
    doc.setFillColor(brandBrown[0], brandBrown[1], brandBrown[2]);
    doc.rect(summaryX - 5, yPos - 4, 210 - summaryX - margin + 10, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(tPDF('Gross Quote'), summaryX, yPos + 5);
    const totalStr = `${costs.total.toLocaleString(undefined, {maximumFractionDigits:0})} AED`;
    doc.text(totalStr, 210 - margin - doc.getTextWidth(totalStr), yPos + 5);

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const footerY = 285;
    doc.text(`Note: ${tPDF('Terms Factory')} | ${tPDF('Commercial Grade')} | ${tPDF('Verified Status')}`, margin, footerY - 5);
    doc.text(tPDF('Date') + ': ' + new Date().toLocaleDateString('en-GB'), margin, footerY);
    
    const footerBrandName = 'GCI LIVING - LUXURY INTERIORS';
    doc.text(footerBrandName, 210 - margin - doc.getTextWidth(footerBrandName), footerY);

    doc.save(`GCI-Quotation-${quoteInfo.quoteNumber || 'Draft'}.pdf`);
  };

  const t = (key: string) => {
    return translations.bilingual[key] || translations.en[key] || key;
  };

  const tPDF = (key: string) => {
    if (!key) return '';
    
    // Multi-pass translation for composite strings
    let result = key;
    
    // Check direct translation first
    if (translations.en[key]) return translations.en[key];

    // Strip common bilingual patterns "Chinese / English" -> "English"
    if (result.includes(' / ')) {
      const parts = result.split(' / ');
      if (parts.length > 1) return parts[1].trim();
    }

    // Identify and replace known BOM prefixes and technical terms
    const bomMappings: Record<string, string> = {
      '主体板材': 'Primary Board',
      '饰面工艺': 'Finish',
      '软包工艺': 'Upholstery',
      '框架结构': 'Frame',
      '附加配件': 'Add-ons',
      '五金配套': 'Hardware',
      '安装及硬件': 'Installation & Hardware',
      '模块小计': 'Module Subtotal',
      '多层板': 'Plywood',
      '中纤板': 'MDF',
      '实木': 'Solid Wood',
      '三聚氰胺': 'Melamine',
      '实木贴皮': 'Veneer',
      '烤漆': 'Painted',
      '防火板': 'Laminate',
      '海绵': 'Foam',
      '布艺': 'Fabric',
      '皮革': 'Leather',
      '合页': 'Hinge',
      '滑轨': 'Runner',
      '拉手': 'Handle',
      '抽屉组件': 'Drawer Module',
      '椅子框架': 'Chair Frame',
      '椅腿': 'Legs',
      '椅背': 'Backrest',
      '坐垫': 'Seat',
      '扶手': 'Armrest',
      '台面': 'Top',
      '桌腿': 'Base',
      '柜体': 'Cabinet Body',
      '抽屉': 'Drawer',
      '层板': 'Shelf'
    };

    for (const [cn, en] of Object.entries(bomMappings)) {
      if (result.includes(cn)) {
        result = result.split(cn).join(en);
      }
    }

    // Final cleanup: remove any remaining Chinese characters
    result = result.replace(/[\u4e00-\u9fa5]/g, '').trim();
    // Clean up empty parentheses or double spaces left after stripping
    result = result.replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();

    return result || key;
  };

  const bom = useMemo(() => {
    const items: BOMItem[] = [];
    
    if (selectedCategory === FurnitureCategory.BED) {
      const { width, length, height, headboardHeight, material, thickness } = config;
      const wM = width / 1000;
      const lM = length / 1000;
      const hM = height / 1000;
      const hbM = headboardHeight / 1000;
      const tF = THICKNESS_FACTORS[thickness];
      const woodPrice = prices[material];

      const baseArea = wM * lM;
      const sideArea = 2 * lM * hM;
      const footArea = wM * hM;
      const headArea = wM * hbM;
      const totalBoardArea = (baseArea + sideArea + footArea + headArea) * tF;

      const groupName = 'Standard Configuration';

      items.push({
        component: `主体板材 ${material} Boards (${thickness})`,
        quantity: Number(totalBoardArea.toFixed(2)),
        unit: 'm²',
        unitPrice: woodPrice,
        total: totalBoardArea * woodPrice,
        group: groupName
      });

      let finishRate = 0;
      if (config.finish === FinishType.MELAMINE) finishRate = prices.finishMelamine;
      if (config.finish === FinishType.VENEER) finishRate = prices.finishVeneer;
      if (config.finish === FinishType.PAINTED) finishRate = prices.finishPainted;
      if (config.finish === FinishType.LAMINATE) finishRate = prices.finishLaminate;

      items.push({
        component: `饰面工艺 Finish: ${t(config.finish)}`,
        quantity: Number(totalBoardArea.toFixed(2)),
        unit: 'm²',
        unitPrice: finishRate,
        total: totalBoardArea * finishRate,
        group: groupName
      });

      if (config.headboard !== HeadboardType.WOODEN) {
        let uphPrice = 0;
        if (config.headboard === HeadboardType.FABRIC) uphPrice = prices.upholsteryFabric;
        if (config.headboard === HeadboardType.PU_LEATHER) uphPrice = prices.upholsteryPU;
        if (config.headboard === HeadboardType.GENUINE_LEATHER) uphPrice = prices.upholsteryLeather;

        items.push({
          component: `软包工艺 Upholstery: ${t(config.headboard)}`,
          quantity: Number(headArea.toFixed(2)),
          unit: 'm²',
          unitPrice: uphPrice,
          total: headArea * uphPrice,
          group: groupName
        });
      }

      items.push({
        component: `床架结构 Frame: ${config.frame}`,
        quantity: 1,
        unit: 'pc',
        unitPrice: FRAME_TYPE_COSTS[config.frame],
        total: FRAME_TYPE_COSTS[config.frame],
        group: groupName
      });

      config.addOns.forEach(addon => {
        items.push({
          component: `附加配件 Add-on: ${t(addon)}`,
          quantity: 1,
          unit: 'pc',
          unitPrice: ADDON_COSTS_BASE[addon],
          total: ADDON_COSTS_BASE[addon],
          group: groupName
        });
      });
    } else if (selectedCategory === FurnitureCategory.CHAIR) {
      const { width, depth, seatHeight, backHeight, type, frameMaterial, legType, backrest, seat, upholstery, armrest, finish, addOns } = chairConfig;
      
      const wM = width / 1000;
      const dM = depth / 1000;
      const hM = backHeight / 1000;
      
      // Approximation of material area for a chair
      const boardArea = (wM * dM) + (wM * hM) + (dM * hM * 0.2); // Seat + Back + tiny bit of frame
      const woodPrice = prices[frameMaterial];

      // Frame
      items.push({
        component: `椅子框架 Frame: ${t(type)} (${t(frameMaterial)})`,
        quantity: Number(boardArea.toFixed(2)),
        unit: 'm²',
        unitPrice: woodPrice,
        total: boardArea * woodPrice
      });

      // Legs
      items.push({
        component: `椅腿 Legs: ${t(legType)}`,
        quantity: 1,
        unit: 'set',
        unitPrice: legType === LegType.SWIVEL ? 250 : legType === LegType.METAL ? 150 : 100,
        total: legType === LegType.SWIVEL ? 250 : legType === LegType.METAL ? 150 : 100
      });

      // Backrest
      items.push({
        component: `椅背 Backrest: ${t(backrest)}`,
        quantity: 1,
        unit: 'pc',
        unitPrice: backrest === BackrestType.UPHOLSTERED ? 120 : 60,
        total: backrest === BackrestType.UPHOLSTERED ? 120 : 60
      });

      // Seat
      items.push({
        component: `坐垫 Seat: ${t(seat)}`,
        quantity: 1,
        unit: 'pc',
        unitPrice: seat === SeatType.HARD ? 50 : 100,
        total: seat === SeatType.HARD ? 50 : 100
      });

      // Upholstery
      if (backrest === BackrestType.UPHOLSTERED || seat !== SeatType.HARD) {
        let uphPrice = 0;
        if (upholstery === SofaUpholsteryType.FABRIC) uphPrice = prices.upholsteryFabric;
        if (upholstery === SofaUpholsteryType.PU) uphPrice = prices.upholsteryPU;
        if (upholstery === SofaUpholsteryType.MICROFIBER) uphPrice = prices.upholsteryPU * 1.5;
        if (upholstery === SofaUpholsteryType.GENUINE_LEATHER) uphPrice = prices.upholsteryLeather;

        // Upholstery area based on dimensions
        const uphArea = (wM * dM) + (wM * (backrest === BackrestType.UPHOLSTERED ? hM : 0));
        items.push({
          component: `面料 Upholstery: ${t(upholstery)}`,
          quantity: Number(uphArea.toFixed(2)),
          unit: 'm²',
          unitPrice: uphPrice,
          total: uphArea * uphPrice
        });
      }

      // Armrest
      if (armrest !== ArmrestType.NONE) {
        items.push({
          component: `扶手 Armrest: ${t(armrest)}`,
          quantity: 1,
          unit: 'set',
          unitPrice: 120,
          total: 120
        });
      }

      // Finish
      items.push({
        component: `表面处理 Finish: ${t(finish)}`,
        quantity: Number(boardArea.toFixed(2)),
        unit: 'm²',
        unitPrice: prices.finishMelamine,
        total: boardArea * prices.finishMelamine
      });

      // Hardware
      items.push({
        component: '五金配件 Hardware',
        quantity: 1,
        unit: 'set',
        unitPrice: 40,
        total: 40
      });

      addOns.forEach(addon => {
        items.push({
          component: `附加项 Add-on: ${t(addon)}`,
          quantity: 1,
          unit: 'pc',
          unitPrice: 100,
          total: 100
        });
      });
    } else if (selectedCategory === FurnitureCategory.DINING_TABLE) {
      const { shape, topMaterial, thickness, baseType, edge, width, length, height, finish } = diningTableConfig;
      const wM = width / 1000;
      const lM = length / 1000;
      const hM = height / 1000;
      const tF = THICKNESS_FACTORS[thickness];
      const woodPrice = prices[topMaterial];
      const area = wM * lM;

      // Top
      items.push({
        component: `台面 Top: ${t(topMaterial)} (${t(shape)})`,
        quantity: Number(area.toFixed(2)),
        unit: 'm²',
        unitPrice: woodPrice * tF,
        total: area * woodPrice * tF
      });

      // Base/Legs
      items.push({
        component: `桌脚 Base: ${t(baseType)} (H:${height}mm)`,
        quantity: 1,
        unit: 'set',
        unitPrice: (baseType === TableBaseType.METAL ? 650 : baseType === TableBaseType.PEDESTAL ? 850 : 450) * (hM / 0.75),
        total: (baseType === TableBaseType.METAL ? 650 : baseType === TableBaseType.PEDESTAL ? 850 : 450) * (hM / 0.75)
      });

      // Finish
      items.push({
        component: `饰面 Finish: ${t(finish)}`,
        quantity: Number(area.toFixed(2)),
        unit: 'm²',
        unitPrice: prices.finishVeneer,
        total: area * prices.finishVeneer
      });

      // Edge
      items.push({
        component: `边缘处理 Edge: ${t(edge)}`,
        quantity: 1,
        unit: 'set',
        unitPrice: 150,
        total: 150
      });
    } else if (selectedCategory === FurnitureCategory.SOFA) {
      const { length, depth, seatHeight, backHeight, frameType, cushionType, upholsteryType, addOns } = sofaConfig;
      const lM = length / 1000;
      const dM = depth / 1000;
      const shM = seatHeight / 1000;
      const bhM = backHeight / 1000;

      items.push({
        component: `沙发框架 Frame: ${t(frameType)}`,
        quantity: 1,
        unit: 'pc',
        unitPrice: SOFA_FRAME_COSTS[frameType] * (lM / 2),
        total: SOFA_FRAME_COSTS[frameType] * (lM / 2)
      });

      items.push({
        component: `座包海绵 Cushion: ${t(cushionType)}`,
        quantity: 1,
        unit: 'pc',
        unitPrice: SOFA_CUSHION_COSTS[cushionType] * (lM / 2),
        total: SOFA_CUSHION_COSTS[cushionType] * (lM / 2)
      });

      // Surface area for upholstery
      const surfaceArea = (lM * dM) + (lM * bhM) + (2 * dM * bhM);
      const uphPrice = SOFA_UPHOLSTERY_COSTS[upholsteryType];
      items.push({
        component: `软包面料 Upholstery: ${t(upholsteryType)}`,
        quantity: Number(surfaceArea.toFixed(2)),
        unit: 'm²',
        unitPrice: uphPrice,
        total: surfaceArea * uphPrice
      });

      items.push({
        component: '沙发脚与配件 Legs & Add-ons',
        quantity: 1,
        unit: 'set',
        unitPrice: 250,
        total: 250
      });

      addOns.forEach(addon => {
        items.push({
          component: `附加项 Add-on: ${t(addon)}`,
          quantity: 1,
          unit: 'pc',
          unitPrice: ADDON_COSTS_BASE[addon] || 150,
          total: ADDON_COSTS_BASE[addon] || 150
        });
      });
    } else if (selectedCategory === FurnitureCategory.WARDROBE || selectedCategory === FurnitureCategory.CABINET || selectedCategory === FurnitureCategory.TV_UNIT) {
      modularConfig.modules.forEach((module, idx) => {
        const wM = module.width / 1000;
        const hM = module.height / 1000;
        const dM = module.depth / 1000;
        const tF = THICKNESS_FACTORS[module.thickness];
        const woodPrice = prices[module.material];
        
        const groupName = `Module ${idx + 1}: ${t(module.type)}`;

        // Calculate board area: front, back, two sides, top, bottom
        const boardArea = ((wM * hM * 2) + (wM * dM * 2) + (hM * dM * 2)) * tF;
        const totalBoardArea = boardArea * module.quantity;

        items.push({
          component: `板材 Board: ${t(module.material)} (${t(module.thickness)})`,
          quantity: Number(totalBoardArea.toFixed(2)),
          unit: 'm²',
          unitPrice: woodPrice,
          total: totalBoardArea * woodPrice,
          group: groupName
        });

        // Finish
        let finishRate = 0;
        if (module.finish === FinishType.MELAMINE) finishRate = prices.finishMelamine;
        if (module.finish === FinishType.VENEER) finishRate = prices.finishVeneer;
        if (module.finish === FinishType.PAINTED) finishRate = prices.finishPainted;
        if (module.finish === FinishType.LAMINATE) finishRate = prices.finishLaminate;

        items.push({
          component: `饰面 Finish: ${t(module.finish)}`,
          quantity: Number(totalBoardArea.toFixed(2)),
          unit: 'm²',
          unitPrice: finishRate,
          total: totalBoardArea * finishRate,
          group: groupName
        });

        // Door area
        if (module.doorType !== DoorType.OPEN) {
          const doorArea = wM * hM * module.quantity;
          items.push({
            component: `门板 Door: ${t(module.doorType)} (${module.doorCount} doors)`,
            quantity: Number(doorArea.toFixed(2)),
            unit: 'm²',
            unitPrice: finishRate * 0.5, // Buffer for door specific work
            total: doorArea * finishRate * 0.5,
            group: groupName
          });

          // Hinges
          const hingePrice = module.hingeType === HingeType.SOFT_CLOSE ? 45 : 20;
          const hingeQty = module.doorCount * 2 * module.quantity;
          items.push({
            component: `合页 Hinge: ${t(module.hingeType)}`,
            quantity: hingeQty,
            unit: 'pc',
            unitPrice: hingePrice,
            total: hingeQty * hingePrice,
            group: groupName
          });
        }

        // Drawers
        if (module.hasDrawers) {
          const drawerCost = 150 * module.drawerCount * module.quantity;
          items.push({
            component: `抽屉构建 Drawer Module x ${module.drawerCount}`,
            quantity: module.drawerCount * module.quantity,
            unit: 'set',
            unitPrice: 150,
            total: drawerCost,
            group: groupName
          });

          // Runners
          const runnerPrice = module.runnerType === RunnerType.SOFT_CLOSE ? 95 : 45;
          const runnerQty = module.drawerCount * module.quantity;
          items.push({
            component: `滑轨 Runner: ${t(module.runnerType)}`,
            quantity: runnerQty,
            unit: 'set',
            unitPrice: runnerPrice,
            total: runnerQty * runnerPrice,
            group: groupName
          });
        }

        // Shelves
        if (module.shelfCount > 0) {
          const shelfArea = wM * dM * module.shelfCount * module.quantity;
          items.push({
            component: `内部层板 Internal Shelves x ${module.shelfCount}`,
            quantity: Number(shelfArea.toFixed(2)),
            unit: 'm²',
            unitPrice: woodPrice * 0.8,
            total: shelfArea * woodPrice * 0.8,
            group: groupName
          });
        }

        // Hanging Rail
        if (module.hasHangingRail) {
          items.push({
            component: `挂衣杆 Hanging Rail`,
            quantity: module.quantity,
            unit: 'pc',
            unitPrice: 85,
            total: 85 * module.quantity,
            group: groupName
          });
        }

        // Handles
        if (module.handle !== HandleType.NONE) {
          const handlePrice = module.handle === HandleType.HIDDEN ? 120 : 45;
          const handleQty = (module.doorCount + (module.hasDrawers ? module.drawerCount : 0)) * module.quantity;
          items.push({
            component: `拉手 Handle: ${t(module.handle)}`,
            quantity: handleQty,
            unit: 'pc',
            unitPrice: handlePrice,
            total: handleQty * handlePrice,
            group: groupName
          });
        }

        // General Hardware (Assembly items)
        const hardwareCost = 50 * module.quantity;
        items.push({
          component: `组装配件及辅料 Hardware & Misc`,
          quantity: module.quantity,
          unit: 'set',
          unitPrice: 50,
          total: hardwareCost,
          group: groupName
        });
      });
    } else {
      // Fallback for Generic
      const { width, length, height, material, thickness, finish, addOns } = genericConfig;
      const wM = width / 1000;
      const lM = length / 1000;
      const hM = height / 1000;
      const area = (wM * lM) + (2 * wM * hM) + (2 * lM * hM);
      const woodPrice = prices[material];

      items.push({
        component: `${t(selectedCategory || FurnitureCategory.TABLE_DESK)} 主材 Board`,
        quantity: Number(area.toFixed(2)),
        unit: 'm²',
        unitPrice: woodPrice,
        total: area * woodPrice
      });

      items.push({
        component: '五金与结构配件 Hardware',
        quantity: 1,
        unit: 'set',
        unitPrice: 200,
        total: 200
      });

      addOns.forEach(addon => {
        items.push({
          component: `附加配件 Add-on: ${t(addon)}`,
          quantity: 1,
          unit: 'pc',
          unitPrice: 150,
          total: 150
        });
      });
    }

    // Common Footer items for all BOMs: Color (Price 0)
    const currentConfig = 
      selectedCategory === FurnitureCategory.BED ? config :
      selectedCategory === FurnitureCategory.SOFA ? sofaConfig :
      selectedCategory === FurnitureCategory.CHAIR ? chairConfig :
      selectedCategory === FurnitureCategory.DINING_TABLE ? diningTableConfig :
      selectedCategory === FurnitureCategory.WARDROBE ? wardrobeConfig :
      selectedCategory === FurnitureCategory.CABINET ? cabinetConfig :
      selectedCategory === FurnitureCategory.TV_UNIT ? tvUnitConfig :
      genericConfig;

    items.push({
      component: currentConfig.color === Color.CUSTOM 
        ? `颜色方案 Color: Custom (${currentConfig.customColor || 'Pending Spec'})` 
        : `颜色方案 Color: ${t(currentConfig.color)}`,
      quantity: 1,
      unit: 'set',
      unitPrice: 0,
      total: 0
    });

    return items;
  }, [config, sofaConfig, chairConfig, diningTableConfig, wardrobeConfig, cabinetConfig, tvUnitConfig, modularConfig, genericConfig, prices, selectedCategory]);

  const costs = useMemo(() => {
    const rawMaterialTotal = bom.reduce((sum, item) => sum + item.total, 0);
    
    const { labor, packaging, transport, installation, marginPercent, vatPercent } = costOverrides;
    const subtotal = rawMaterialTotal + labor + packaging + transport + installation;
    const margin = subtotal * (marginPercent / 100);
    const totalBeforeVat = subtotal + margin;
    const vat = totalBeforeVat * (vatPercent / 100);

    return {
      material: rawMaterialTotal,
      labor,
      packaging,
      transport,
      installation,
      margin,
      vat,
      total: totalBeforeVat + vat
    };
  }, [bom, costOverrides]);

  const handleNext = () => currentStep < STEPS.length - 1 && setCurrentStep(c => c + 1);
  const handleBack = () => currentStep > 0 && setCurrentStep(c => c - 1);
  const updateConfig = (u: Partial<BedConfiguration>) => setConfig(p => ({ ...p, ...u }));
  const toggleAddOn = (a: AddOn) => setConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const updateGenericConfig = (u: Partial<GenericConfiguration>) => setGenericConfig(p => ({ ...p, ...u }));
  const toggleGenericAddOn = (a: AddOn) => setGenericConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const updateSofaConfig = (u: Partial<SofaConfiguration>) => setSofaConfig(p => ({ ...p, ...u }));
  const toggleSofaAddOn = (a: AddOn) => setSofaConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const updateChairConfig = (u: Partial<ChairConfiguration>) => setChairConfig(p => ({ ...p, ...u }));
  const toggleChairAddOn = (a: AddOn) => setChairConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const updateDiningTableConfig = (u: Partial<DiningTableConfiguration>) => setDiningTableConfig(p => ({ ...p, ...u }));

  const updateWardrobeConfig = (u: Partial<WardrobeConfiguration>) => setWardrobeConfig(p => ({ ...p, ...u }));
  const toggleWardrobeAddOn = (a: AddOn) => setWardrobeConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const updateCabinetConfig = (u: Partial<CabinetConfiguration>) => setCabinetConfig(p => ({ ...p, ...u }));
  const toggleCabinetAddOn = (a: AddOn) => setCabinetConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const updateTVUnitConfig = (u: Partial<TVUnitConfiguration>) => setTVUnitConfig(p => ({ ...p, ...u }));
  const toggleTVUnitAddOn = (a: AddOn) => setTVUnitConfig(p => ({
    ...p,
    addOns: p.addOns.includes(a) ? p.addOns.filter(x => x !== a) : [...p.addOns, a]
  }));

  const handleAddModule = () => {
    const newModule: CabinetModule = {
      id: Math.random().toString(36).substr(2, 9),
      type: CabinetModuleType.STORAGE,
      quantity: 1,
      width: 600,
      depth: 600,
      height: 2400,
      material: Material.PLYWOOD,
      thickness: Thickness.T18,
      doorType: DoorType.SWING,
      doorCount: 2,
      shelfCount: 4,
      hasHangingRail: false,
      hasDrawers: false,
      drawerCount: 0,
      hingeType: HingeType.SOFT_CLOSE,
      runnerType: RunnerType.SOFT_CLOSE,
      handle: HandleType.EXTERNAL,
      finish: FinishType.MELAMINE,
      color: Color.WHITE,
      mounting: MountingType.FLOOR
    };
    setEditingModule(newModule);
    setIsModuleModalOpen(true);
  };

  const handleEditModule = (module: CabinetModule) => {
    setEditingModule({ ...module });
    setIsModuleModalOpen(true);
  };

  const handleDuplicateModule = (module: CabinetModule) => {
    const duplicated: CabinetModule = {
      ...module,
      id: Math.random().toString(36).substr(2, 9)
    };
    setModularConfig(prev => ({
      ...prev,
      modules: [...prev.modules, duplicated]
    }));
  };

  const handleDeleteModule = (id: string) => {
    if (confirm(t('Confirm Delete Module'))) {
      setModularConfig(prev => ({
        ...prev,
        modules: prev.modules.filter(m => m.id !== id)
      }));
    }
  };

  const handleSaveModule = () => {
    if (!editingModule) return;
    setModularConfig(prev => {
      const exists = prev.modules.find(m => m.id === editingModule.id);
      if (exists) {
        return {
          ...prev,
          modules: prev.modules.map(m => m.id === editingModule.id ? editingModule : m)
        };
      } else {
        return {
          ...prev,
          modules: [...prev.modules, editingModule]
        };
      }
    });
    setIsModuleModalOpen(false);
    setEditingModule(null);
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    const recs = SCENARIO_RECOMMENDATIONS[scenario];
    
    // Pre-fill Bed
    setConfig(prev => ({
      ...prev,
      material: (recs.material as Material) || prev.material,
      thickness: (recs.thickness as Thickness) || prev.thickness,
      finish: (recs.finish as FinishType) || prev.finish,
      frame: (recs.frame as FrameType) || prev.frame,
    }));

    // Pre-fill Sofa
    setSofaConfig(prev => ({
      ...prev,
      frameType: (recs.frameType as SofaFrameType) || prev.frameType,
      cushionType: (recs.cushionType as SofaCushionType) || prev.cushionType,
      upholsteryType: (recs.upholsteryType as SofaUpholsteryType) || prev.upholsteryType,
    }));

    // Pre-fill Generic
    setGenericConfig(prev => ({
      ...prev,
      material: (recs.material as Material) || prev.material,
      thickness: (recs.thickness as Thickness) || prev.thickness,
      finish: (recs.finish as FinishType) || prev.finish,
    }));
  };

  const SCENARIO_ICONS: Record<Scenario, any> = {
    [Scenario.LABOUR_CAMP]: Building2,
    [Scenario.VILLA]: Home,
    [Scenario.APARTMENT]: Building,
    [Scenario.HOTEL]: Bed,
    [Scenario.OFFICE]: Briefcase,
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(',')[1];
        resolve(base64String || '');
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('target' in event && (event.target as HTMLInputElement).files) {
      files = Array.from((event.target as HTMLInputElement).files || []);
    } else if ('dataTransfer' in event) {
      files = Array.from(event.dataTransfer.files);
    }
    
    if (files.length === 0) return;

    const file = files[0];
    const isExcelOrCsv = file.name.endsWith('.xlsx') || file.name.endsWith('.csv');
    const isImage = file.type.startsWith('image/');

    if (isExcelOrCsv) {
      parseExcel(file);
    } else if (isImage) {
      analyzeImage(file);
    } else {
      alert("Unsupported file format. Please upload Excel, CSV or Image.");
    }
  };

  const parseExcel = async (file: File) => {
    setIsProcessingAI(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No sheets found in Excel file.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        if (!jsonData || jsonData.length < 1) {
          throw new Error('Excel file appears to be empty.');
        }

        // 1. Find Header Row (row with most keywords)
        const keywords = {
          item: ['furniture item', 'item', 'product', 'description', '分项', '产品名称', '品名', '项目名称'],
          spec: ['specification', 'size', 'dimension', 'specs', '规格', '尺寸', '描述'],
          qty: ['qty', 'quantity', '数量'],
          price: ['unit price', 'price', 'target price', '单价', '目标价'],
          total: ['total', 'amount', 'subtotal', '小计', '合计'],
          no: ['no.', 's.no', '序号', '编号', 'sn'] // To skip them as items
        };

        let bestHeaderRowIndex = -1;
        let maxMatchCount = 0;

        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
          const row = (jsonData[i] || []).map((c: any) => String(c || '').toLowerCase().trim());
          let matchCount = 0;
          if (row.some((c: any) => keywords.item.some(k => c.includes(k)))) matchCount++;
          if (row.some((c: any) => keywords.qty.some(k => c.includes(k)))) matchCount++;
          if (row.some((c: any) => keywords.price.some(k => c.includes(k)))) matchCount++;
          
          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestHeaderRowIndex = i;
          }
        }

        const headers = bestHeaderRowIndex !== -1 
          ? jsonData[bestHeaderRowIndex].map((h: any) => String(h || '').toLowerCase().trim())
          : jsonData[0].map((h: any) => String(h || '').toLowerCase().trim());

        const findCol = (kList: string[]) => headers.findIndex((h: string) => kList.some(k => h === k || (h.length > 1 && h.includes(k))));

        const mappings = {
          item: findCol(keywords.item),
          spec: findCol(keywords.spec),
          qty: findCol(keywords.qty),
          price: findCol(keywords.price),
          total: findCol(keywords.total),
          no: findCol(keywords.no)
        };

        // If Item Column detection is ambiguous (e.g. found No. as item), try to refine
        if (mappings.item === mappings.no && mappings.item !== -1) {
           mappings.item = headers.findIndex((h, idx) => idx !== mappings.no && keywords.item.some(k => h.includes(k)));
        }

        setRawExcelData(jsonData.slice(bestHeaderRowIndex !== -1 ? bestHeaderRowIndex : 0));
        setExcelMappings({
          item: mappings.item !== -1 ? mappings.item : 0,
          spec: mappings.spec !== -1 ? mappings.spec : 1,
          qty: mappings.qty !== -1 ? mappings.qty : 2,
          price: mappings.price !== -1 ? mappings.price : 4,
          total: mappings.total !== -1 ? mappings.total : 5
        });
        setShowMapping(true);

      } catch (err) {
        console.error('Error parsing Excel:', err);
        alert(t('Failed to parse Excel file') + ': ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsProcessingAI(false);
      }
    };

    reader.onerror = () => {
      alert(t('Failed to read file.'));
      setIsProcessingAI(false);
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('readAsArrayBuffer error:', err);
      setIsProcessingAI(false);
    }
  };

  const processMappedData = async () => {
    if (!rawExcelData) return;

    setIsProcessingAI(true);
    setShowMapping(false);

    try {
      const dataRows = rawExcelData.slice(1); // Skip header
      const rows = dataRows.map((row: any, idx: number) => {
        const name = String(row[excelMappings.item] || '').trim();
        
        // Skip conditions
        const isHeader = name.toLowerCase().includes('item') || name.toLowerCase().includes('品名');
        const isSerialOnly = /^\d+$/.test(name) || 
                            ['no', 'no.', 's.no', 's.no.', '序号', '编号', 'sn', '序号.', '品名', '分项'].includes(name.toLowerCase()) ||
                            name.length < 2 && /^\d$/.test(name);
        const isEmpty = !name || name === '0';

        if (isHeader || isSerialOnly || isEmpty) return null;

        return {
          id: `draft-xl-${Date.now()}-${idx}`,
          originalName: name,
          originalSpec: String(row[excelMappings.spec] || '').trim(),
          quantity: parseFloat(String(row[excelMappings.qty] || '0').replace(/[^0-9.-]/g, '')) || 1,
          unit: 'pc',
          targetUnitPrice: parseFloat(String(row[excelMappings.price] || '0').replace(/[^0-9.-]/g, '')) || 0,
          targetTotal: parseFloat(String(row[excelMappings.total] || '0').replace(/[^0-9.-]/g, '')) || 0,
          status: 'Need Review' as const
        };
      }).filter(r => r !== null);

      if (rows.length === 0) {
        throw new Error('No valid furniture items found in the selected columns.');
      }

      await processWithAI(rows);
    } catch (err) {
      console.error('Processing mapped data failed:', err);
      alert(t('Processing failed') + ': ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsProcessingAI(false);
    }
  };

  const analyzeImage = async (file: File) => {
    setIsProcessingAI(true);
    try {
      const base64 = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `
        Analyze this image of a client furniture requirement list or table.
        Extract the items into a structured list. For each item, try to find:
        - Item Name
        - Specification/Size
        - Quantity
        - Unit
        - Target Unit Price
        - Target Total
        
        Return ONLY valid JSON as an array of objects matching this schema:
        [
          {
            "originalName": "Item name",
            "originalSpec": "Size/Spec",
            "quantity": 1,
            "unit": "pc",
            "targetUnitPrice": 0,
            "targetTotal": 0
          }
        ]
        If data is missing, use default values. Be conservative with extraction.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Use flash for vision
        contents: [
          { role: 'user', parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64 } }
          ]}
        ],
        config: { responseMimeType: "application/json" }
      });

      const extractedItems = JSON.parse(response.text || '[]');
      const rows = extractedItems.map((it: any, idx: number) => ({
        ...it,
        id: `draft-img-${Date.now()}-${idx}`,
        status: 'Need Review' as const
      }));

      await processWithAI(rows);
    } catch (err) {
      console.error('Vision Analysis Error:', err);
      alert('AI Vision Analysis failed.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleAnalyze = async () => {
    if (!importText.trim()) return;
    
    setIsProcessingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `
        Analyze the following text input which is a client furniture requirement list.
        Parse it into a structured table.
        
        Input Text:
        ${importText}
        
        Return ONLY valid JSON as an array of objects matching this schema:
        [
          {
            "originalName": "Item name",
            "originalSpec": "Size/Spec",
            "quantity": 1,
            "unit": "pc",
            "targetUnitPrice": 0,
            "targetTotal": 0
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const extractedItems = JSON.parse(response.text || '[]');
      const rows = extractedItems.map((it: any, idx: number) => ({
        ...it,
        id: `draft-text-${Date.now()}-${idx}`,
        status: 'Need Review' as const
      }));

      await processWithAI(rows);
      setImportText('');
    } catch (err) {
      console.error('Text Analysis Error:', err);
      alert('AI Text Analysis failed.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const processWithAI = async (items: any[]) => {
    if (!items || items.length === 0) {
      setActiveTab('draft');
      return;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('Gemini API Key is not configured. Please check your environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const itemDescriptions = items.map(it => `[Item: ${it.originalName}, Spec: ${it.originalSpec}]`).join('\n');
      
      const prompt = `
        You are a high-precision furniture classification engine for GCI Living. 
        Analyze the following list of items and map each to exactly one of these CATEGORIES:
        - Bed
        - Sofa
        - Wardrobe
        - Cabinet
        - Table / Desk
        - Chair
        - TV Unit
        - Dining Table
        - Other / Non-furniture (For appliances, accessories, electronics, or items that aren't wooden/upholstered furniture)

        Rules:
        1. If an item name contains multiple items (e.g., "Desk with Chair", "Table & 4 Chairs"), mark isSplittable as true.
        2. Assign a confidence score (0.0 to 1.0).
        3. Determine status: "Confirmed" if clear mapping, "Need Review" if ambiguous, "Need Split" if multiple items found.
        4. Return ONLY valid JSON as an array of objects matching this schema:
        { "category": "one of the category names above or 'unknown'", "confidence": 0.95, "isSplittable": false, "status": "Confirmed" }
        
        List to analyze:
        ${itemDescriptions}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                isSplittable: { type: Type.BOOLEAN },
                status: { type: Type.STRING }
              }
            }
          }
        }
      });

      const aiResults = JSON.parse(response.text || '[]');
      
      const categoryMap: Record<string, FurnitureCategory> = {
        'Bed': FurnitureCategory.BED,
        'Sofa': FurnitureCategory.SOFA,
        'Wardrobe': FurnitureCategory.WARDROBE,
        'Cabinet': FurnitureCategory.CABINET,
        'Table / Desk': FurnitureCategory.TABLE_DESK,
        'Chair': FurnitureCategory.CHAIR,
        'TV Unit': FurnitureCategory.TV_UNIT,
        'Dining Table': FurnitureCategory.DINING_TABLE,
        'Other / Non-furniture': FurnitureCategory.OTHER
      };

      const mappedItems: DraftItem[] = items.map((it, idx) => {
        const res = aiResults[idx] || {};
        return {
          ...it,
          suggestedCategory: categoryMap[res.category as string] || 'unknown',
          confidence: res.confidence || 0.5,
          isSplittable: res.isSplittable || false,
          status: res.status || 'Need Review'
        };
      });

      setDraftItems(mappedItems);
      setActiveTab('draft');
    } catch (err) {
      console.error('AI Processing Error:', err);
      // Fallback: load items without AI mapping
      setDraftItems(items.map(it => ({
        ...it,
        suggestedCategory: 'unknown',
        confidence: 0,
        status: 'Need Review'
      })));
      setActiveTab('draft');
    }
  };

  const handlePushToConfigurator = (item: DraftItem) => {
    if (item.suggestedCategory === 'unknown') {
      alert(t('Please confirm category before configuring.'));
      return;
    }

    if (item.suggestedCategory === FurnitureCategory.OTHER) {
      const newItem: PackageItem = {
        id: `pkg-${Date.now()}`,
        category: FurnitureCategory.OTHER,
        config: { ...genericConfig },
        quantity: item.quantity,
        bom: [{
          component: item.originalName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.targetUnitPrice,
          total: item.targetTotal
        }],
        totalAmount: item.targetUnitPrice
      };
      setPackageItems([...packageItems, newItem]);
      setDraftItems(draftItems.filter(it => it.id !== item.id));
      setActiveTab('items');
      alert(t('Added to package successfully'));
      return;
    }

    // Set global states to navigate to specific configurator
    setSelectedCategory(item.suggestedCategory as FurnitureCategory);
    setQuoteMode('package'); // Ensure we return to package mode if coming from here
    setCurrentStep(0);
    setDraftItems(draftItems.filter(it => it.id !== item.id));

    // Inject specifications from split item if available
    const updatePayload = {
      notes: item.notes || '',
      sofaType: item.suggestedCategory === FurnitureCategory.SOFA ? (item.specOverride || '') : undefined,
    };
    
    // Helper to find the right set function
    if (item.suggestedCategory === FurnitureCategory.BED) setConfig(p => ({ ...p, notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.SOFA) setSofaConfig(p => ({ ...p, sofaType: item.specOverride || '', notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.WARDROBE) setWardrobeConfig(p => ({ ...p, notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.CABINET) setCabinetConfig(p => ({ ...p, notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.TABLE_DESK) setGenericConfig(p => ({ ...p, notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.CHAIR) setChairConfig(p => ({ ...p, notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.TV_UNIT) setTVUnitConfig(p => ({ ...p, notes: item.notes || '' }));
    else if (item.suggestedCategory === FurnitureCategory.DINING_TABLE) setDiningTableConfig(p => ({ ...p, notes: item.notes || '' }));
  };

  const CATEGORY_ICONS: Record<FurnitureCategory, any> = {
    [FurnitureCategory.BED]: Bed,
    [FurnitureCategory.SOFA]: Armchair,
    [FurnitureCategory.WARDROBE]: Columns,
    [FurnitureCategory.CABINET]: Archive,
    [FurnitureCategory.TABLE_DESK]: Trello,
    [FurnitureCategory.CHAIR]: Layout, // Using Layout for Chair for now
    [FurnitureCategory.TV_UNIT]: Tv,
    [FurnitureCategory.DINING_TABLE]: Utensils,
    [FurnitureCategory.OTHER]: Package
  };

  const renderProjectInfo = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
      <StepIndicator current={1} />
      <div className="text-center space-y-6">
        <div className="inline-block px-4 py-1.5 bg-brand-gold/10 rounded-full mb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold">Project Engineering Workspace</p>
        </div>
        <h2 className="text-5xl font-serif italic text-brand-brown tracking-tight">{t('Project Information')}</h2>
        <p className="text-xs font-medium text-brand-brown-muted max-w-xl mx-auto leading-relaxed">
          {t('Initialization phase')}
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white p-12 sm:p-20 rounded-[64px] border border-brand-beige shadow-[0_30px_100px_-20px_rgba(62,39,35,0.05)] relative overflow-hidden group">
          {/* Decorative accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-beige/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-gold/5 rounded-full -ml-12 -mb-12" />

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-12">
            {[
              { key: 'customerProjectName', label: t('Customer / Project Name'), required: true, placeholder: t('Customer / Project Name') },
              { key: 'phoneWhatsApp', label: t('Phone / WhatsApp'), placeholder: '+971 ...' },
              { key: 'salesperson', label: t('Salesperson'), placeholder: t('Salesperson') },
              { key: 'quoteNumber', label: t('Quotation No.'), placeholder: 'Auto-generated' },
              { key: 'date', label: t('Date'), type: 'date' },
            ].map(field => (
              <div key={field.key} className="space-y-4 group/input">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors group-focus-within/input:text-brand-gold">
                    {field.label}
                    {field.required && <span className="text-brand-gold font-serif italic text-lg leading-none">*</span>}
                  </label>
                </div>
                <input
                  type={field.type || 'text'}
                  value={quoteInfo[field.key as keyof typeof quoteInfo]}
                  placeholder={field.placeholder}
                  onChange={e => {
                    setQuoteInfo({...quoteInfo, [field.key]: e.target.value});
                    if (field.required && validationError) setValidationError('');
                  }}
                  className="w-full bg-transparent border-b-2 border-brand-beige text-2xl font-serif italic text-brand-brown focus:border-brand-gold outline-none pb-4 transition-all duration-300 placeholder:text-brand-brown/10 selection:bg-brand-gold/20"
                />
              </div>
            ))}
          </div>

          <AnimatePresence>
            {validationError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-12 p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-[24px] flex items-center justify-center gap-3 animate-pulse"
              >
                <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                <p className="text-[10px] font-bold text-brand-brown uppercase tracking-[0.2em]">
                  {validationError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-20 flex justify-center">
            <button
              onClick={() => {
                if (!quoteInfo.customerProjectName) {
                  setValidationError(t('Project name required'));
                  return;
                }
                setValidationError('');
                setProjectInfoSubmitted(true);
              }}
              className="px-16 py-8 bg-brand-brown text-brand-ivory rounded-[36px] font-bold uppercase tracking-[0.3em] text-[11px] shadow-[0_25px_60px_-15px_rgba(62,39,35,0.3)] hover:bg-brand-brown/95 hover:-translate-y-1 active:scale-95 transition-all duration-500 flex items-center gap-6"
            >
              {t('Next: Select Category')} 
              <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center group-hover:bg-brand-gold/30 transition-colors">
                <ChevronRight className="w-4 h-4 text-brand-gold" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPackageWorkspace = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setQuoteMode(null);
            setSelectedScenario(null);
            setQuoteType(null);
            setActiveTab('items');
          }}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:text-brand-brown transition-all group"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 返回选择界面 BACK TO MENU
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-brand-gold/10 rounded-full">
            <Package className="w-4 h-4 text-brand-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-brown">{selectedScenario ? t(selectedScenario) : 'Project'} Package Mode</span>
          </div>
        </div>
      </div>

      {/* Split Modal */}
      {showSplitModal && itemToSplit && (
        <div className="fixed inset-0 z-[110] bg-brand-brown/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl rounded-[48px] shadow-2xl border border-brand-beige overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-brand-beige bg-brand-beige/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Split className="w-6 h-6 text-brand-gold" />
                  <h3 className="text-xl font-serif italic text-brand-brown">{t('Split Combined Item')}</h3>
                </div>
                <button onClick={() => setShowSplitModal(false)} className="text-brand-brown/40 hover:text-brand-gold transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-4 p-4 bg-brand-beige/20 rounded-2xl text-brand-brown-muted text-xs italic">
                {t('Original')}: <span className="font-bold">{itemToSplit.originalName}</span> {itemToSplit.originalSpec && `(${itemToSplit.originalSpec})`}
              </p>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {splitResult.map((res, idx) => (
                  <div key={res.id} className="grid grid-cols-12 gap-4 items-start p-6 bg-brand-beige/5 rounded-3xl border border-brand-beige/50">
                    <div className="col-span-2">
                      <label className="text-[8px] font-bold text-brand-brown-muted uppercase tracking-widest mb-2 block">{t('Item Name')}</label>
                      <input 
                        value={res.originalName}
                        onChange={(e) => {
                          const updated = [...splitResult];
                          updated[idx].originalName = e.target.value;
                          setSplitResult(updated);
                        }}
                        className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[8px] font-bold text-brand-brown-muted uppercase tracking-widest mb-2 block">{t('Category')}</label>
                      <select 
                        value={res.suggestedCategory}
                        onChange={(e) => {
                          const updated = [...splitResult];
                          updated[idx].suggestedCategory = e.target.value as FurnitureCategory;
                          setSplitResult(updated);
                        }}
                        className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown"
                      >
                        <option value="unknown">Select...</option>
                        {Object.values(FurnitureCategory).map(cat => (
                          <option key={cat} value={cat}>{t(cat)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[8px] font-bold text-brand-brown-muted uppercase tracking-widest mb-2 block">{t('Type / Specification')}</label>
                      {res.suggestedCategory === FurnitureCategory.SOFA ? (
                        <div className="space-y-2">
                          <select 
                            value={SOFA_TYPES.includes(res.specOverride || '') ? res.specOverride : (res.specOverride ? 'Other' : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...splitResult];
                              if (val === 'Other') {
                                if (SOFA_TYPES.includes(updated[idx].specOverride || '')) {
                                  updated[idx].specOverride = '';
                                }
                              } else {
                                updated[idx].specOverride = val;
                              }
                              setSplitResult(updated);
                            }}
                            className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown"
                          >
                            <option value="">{t('Select type...')}</option>
                            {SOFA_TYPES.filter(type => type !== 'Other').map(type => (
                              <option key={type} value={type}>{t(type)}</option>
                            ))}
                            <option value="Other">{t('Manual Entry...')}</option>
                          </select>
                          {((res.specOverride !== undefined && !SOFA_TYPES.filter(t => t !== 'Other').includes(res.specOverride) && res.specOverride !== '') || (res.specOverride === '' && res.suggestedCategory === FurnitureCategory.SOFA)) && (
                            <input 
                              placeholder={t('Type specification...')}
                              value={res.specOverride || ''}
                              onChange={(e) => {
                                const updated = [...splitResult];
                                updated[idx].specOverride = e.target.value;
                                setSplitResult(updated);
                              }}
                              className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown mt-1"
                            />
                          )}
                        </div>
                      ) : (
                        <input 
                          placeholder={t('Type specification...')}
                          value={res.specOverride || ''}
                          onChange={(e) => {
                            const updated = [...splitResult];
                            updated[idx].specOverride = e.target.value;
                            setSplitResult(updated);
                          }}
                          className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown"
                        />
                      )}
                    </div>
                    <div className="col-span-1">
                       <label className="text-[8px] font-bold text-brand-brown-muted uppercase tracking-widest mb-2 block">{t('Qty')}</label>
                       <input 
                        type="number"
                        value={res.quantity}
                        onChange={(e) => {
                          const updated = [...splitResult];
                          updated[idx].quantity = parseInt(e.target.value) || 0;
                          setSplitResult(updated);
                        }}
                        className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown text-center"
                       />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[8px] font-bold text-brand-brown-muted uppercase tracking-widest mb-2 block">{t('Notes')}</label>
                      <textarea 
                        placeholder={t('Add notes...')}
                        value={res.notes || ''}
                        onChange={(e) => {
                          const updated = [...splitResult];
                          updated[idx].notes = e.target.value;
                          setSplitResult(updated);
                        }}
                        rows={1}
                        className="w-full bg-white border border-brand-beige rounded-xl px-4 py-2 text-[10px] font-bold text-brand-brown resize-none min-h-[40px]"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-6">
                      <button 
                        onClick={() => setSplitResult(splitResult.filter((_, i) => i !== idx))}
                        className="p-2 text-red-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => setSplitResult([...splitResult, { ...itemToSplit, id: `split-${Date.now()}`, isSplittable: false, status: 'Confirmed', specOverride: '', notes: '' }])}
                  className="w-full py-4 border-2 border-dashed border-brand-beige rounded-3xl text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest hover:border-brand-gold hover:text-brand-gold transition-all"
                >
                  + {t('Add Item')}
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowSplitModal(false)}
                  className="flex-1 px-8 py-5 rounded-3xl border border-brand-beige text-brand-brown-muted text-[10px] font-bold uppercase tracking-widest hover:bg-brand-beige/20 transition-all"
                >
                  {t('Cancel')}
                </button>
                <button 
                  onClick={() => {
                    const idx = draftItems.findIndex(it => it.id === itemToSplit.id);
                    if (idx !== -1) {
                      const updated = [...draftItems];
                      updated.splice(idx, 1, ...splitResult.map(r => ({ ...r, status: 'Confirmed' as const })));
                      setDraftItems(updated);
                      setShowSplitModal(false);
                      alert(t('Successfully split item'));
                    }
                  }}
                  className="flex-[2] px-8 py-5 rounded-3xl bg-brand-brown text-brand-ivory text-[10px] font-bold uppercase tracking-widest hover:bg-brand-brown/90 shadow-xl shadow-brand-brown/20"
                >
                  {t('Apply Split / 应用拆分')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showMapping && rawExcelData && (
        <div className="fixed inset-0 z-[100] bg-brand-brown/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl border border-brand-beige overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-brand-beige bg-brand-beige/5">
              <div className="flex items-center gap-4 mb-2">
                <FileSpreadsheet className="w-6 h-6 text-brand-gold" />
                <h3 className="text-xl font-serif italic text-brand-brown">{t('Column Mapping')}</h3>
              </div>
              <p className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Please map the columns correctly')}</p>
            </div>
            
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {[
                  { label: t('Item Name Column'), key: 'item' },
                  { label: t('Specification Column'), key: 'spec' },
                  { label: t('Qty Column'), key: 'qty' },
                  { label: t('Unit Price Column'), key: 'price' },
                  { label: t('Total Price Column'), key: 'total' }
                ].map(m => (
                  <div key={m.key} className="flex items-center justify-between gap-8">
                    <label className="text-[10px] font-bold text-brand-brown uppercase tracking-widest min-w-[150px]">{m.label}</label>
                    <select 
                      value={excelMappings[m.key]}
                      onChange={(e) => setExcelMappings({...excelMappings, [m.key]: parseInt(e.target.value)})}
                      className="flex-1 bg-brand-beige/5 border border-brand-beige rounded-2xl px-6 py-3 text-xs font-bold text-brand-brown outline-none focus:ring-1 focus:ring-brand-gold transition-all"
                    >
                      {rawExcelData[0].map((h: any, i: number) => (
                        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  onClick={() => setShowMapping(false)}
                  className="flex-1 px-8 py-5 rounded-3xl border border-brand-beige text-brand-brown-muted text-[10px] font-bold uppercase tracking-widest hover:bg-brand-beige/20 transition-all"
                >
                  {t('Cancel')}
                </button>
                <button 
                  onClick={processMappedData}
                  className="flex-2 px-8 py-5 rounded-3xl bg-brand-brown text-brand-ivory text-[10px] font-bold uppercase tracking-widest hover:bg-brand-brown/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-brown/20"
                >
                  <Cpu className="w-4 h-4 text-brand-gold" /> {t('Start Analysis')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Import Zone */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="bg-white rounded-[48px] border border-brand-beige overflow-hidden shadow-2xl shadow-brand-brown/5">
          <div className="p-8 border-b border-brand-beige bg-brand-beige/5">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-brand-gold" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-brown">{t('Import Zone')}</h3>
            </div>
          </div>
          
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left: Text Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-widest flex items-center gap-2">
                    <Clipboard className="w-3 h-3" /> {t('Text Analysis')}
                  </label>
                  <span className="text-[8px] text-brand-brown-muted opacity-50 uppercase font-bold tracking-widest">Paste requirement text</span>
                </div>
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={t('Paste client text here')}
                  className="w-full h-48 p-6 bg-brand-beige/5 border border-brand-beige rounded-[32px] text-xs text-brand-brown placeholder:text-brand-brown/30 resize-none focus:ring-1 focus:ring-brand-gold outline-none transition-all"
                />
              </div>

              {/* Right: File Drop Zone */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-widest flex items-center gap-2">
                    <Upload className="w-3 h-3" /> {t('Upload File')}
                  </label>
                  <span className="text-[8px] text-brand-brown-muted opacity-50 uppercase font-bold tracking-widest">{t('Supported formats')}</span>
                </div>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
                  onClick={() => document.getElementById('advanced-file-upload')?.click()}
                  className={`h-48 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500 group ${
                    isDragging ? 'border-brand-gold bg-brand-gold/5 scale-[0.98]' : 'border-brand-beige hover:border-brand-gold/50 hover:bg-brand-beige/5'
                  }`}
                >
                  <input id="advanced-file-upload" type="file" className="hidden" accept=".xlsx,.csv,image/*" onChange={handleFileUpload} />
                  <div className="w-16 h-16 bg-brand-beige/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isProcessingAI ? (
                       <RefreshCw className="w-8 h-8 text-brand-gold animate-spin" />
                    ) : (
                       <div className="relative">
                          <FileSpreadsheet className="w-8 h-8 text-brand-gold" />
                          <ImageIcon className="w-4 h-4 text-brand-gold absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-brand-gold/20" />
                       </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-brand-brown uppercase tracking-widest text-center px-10">
                    {isDragging ? t('Drop files to upload') : t('Drag and drop files here')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button 
                onClick={handleAnalyze}
                disabled={isProcessingAI || !importText.trim()}
                className={`px-12 py-6 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-95 flex items-center gap-4 ${
                  isProcessingAI || !importText.trim() 
                  ? 'bg-brand-beige/50 text-brand-brown-muted cursor-not-allowed' 
                  : 'bg-brand-brown text-brand-ivory hover:bg-brand-brown/90 shadow-brand-brown/20'
                }`}
              >
                {isProcessingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" />
                    {t('Importing and Analyzing')}
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4 text-brand-gold" />
                    {t('Analyze Client List')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex bg-brand-beige/20 p-1 rounded-2xl border border-brand-beige">
          <button 
            onClick={() => setActiveTab('items')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'items' ? 'bg-white text-brand-brown shadow-sm' : 'text-brand-brown-muted hover:text-brand-brown'}`}
          >
            {t('Project Package Items')}
          </button>
          <button 
            onClick={() => setActiveTab('draft')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'draft' ? 'bg-white text-brand-brown shadow-sm' : 'text-brand-brown-muted hover:text-brand-brown'}`}
          >
            {t('Project Package Draft')}
            {draftItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-gold text-[10px] text-white flex items-center justify-center rounded-full border-2 border-brand-beige shadow-sm">
                {draftItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'items' ? (
        <>
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-serif italic text-brand-brown">项目整套清单 Project Package Items</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">Consolidate multiple items into one engineering specification</p>
          </div>

          <div className="space-y-8">
            {packageItems.length === 0 ? (
              <div className="text-center py-32 bg-brand-beige/5 border-2 border-dashed border-brand-beige rounded-[48px]">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <PlusCircle className="w-8 h-8 text-brand-gold/30" />
                </div>
                <h3 className="text-xl font-serif italic text-brand-brown mb-2">您的清单还是空的 Your package is empty</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/40">Add items below to start building your quote</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {packageItems.map((item, idx) => (
                  <div key={item.id} className="p-8 bg-white border border-brand-beige rounded-[32px] flex items-center justify-between group hover:shadow-xl transition-all duration-500">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 bg-brand-beige/20 rounded-2xl flex items-center justify-center group-hover:bg-brand-gold/10 transition-colors">
                        {(() => {
                          const Icon = CATEGORY_ICONS[item.category];
                          return <Icon className="w-8 h-8 text-brand-gold" />;
                        })()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">Item {idx + 1}</span>
                          <span className="w-1 h-1 rounded-full bg-brand-beige" />
                          <span className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t(item.category)}</span>
                        </div>
                        <h4 className="text-xl font-serif italic text-brand-brown">
                          {item.category === FurnitureCategory.BED ? `${(item.config as any).size} Bed` : `${t(item.category)} Unit`}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                       <div className="flex items-center gap-4 bg-brand-beige/10 p-2 rounded-2xl border border-brand-beige">
                          <button 
                            onClick={() => {
                              const updated = [...packageItems];
                              if (updated[idx].quantity > 1) {
                                updated[idx].quantity -= 1;
                                setPackageItems(updated);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand-brown hover:bg-brand-brown hover:text-brand-ivory transition-all"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold font-mono text-brand-brown">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              const updated = [...packageItems];
                              updated[idx].quantity += 1;
                              setPackageItems(updated);
                            }}
                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand-brown hover:bg-brand-brown hover:text-brand-ivory transition-all"
                          >
                            +
                          </button>
                       </div>
                       <div className="text-right">
                         <span className="text-[10px] font-bold text-brand-brown-muted uppercase block">Total Value</span>
                         <span className="text-2xl font-serif italic text-brand-brown">
                            {(item.totalAmount * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs not-italic">AED</span>
                         </span>
                       </div>
                       <button 
                        onClick={() => setPackageItems(packageItems.filter((_, i) => i !== idx))}
                        className="p-4 rounded-full text-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                       >
                        <X className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-12 border-t border-brand-beige/50">
              <div className="text-center mb-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-brown mb-4">{t('Add to Project Package')}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                {Object.values(FurnitureCategory).map(cat => {
                  const Icon = CATEGORY_ICONS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCurrentStep(0);
                      }}
                      className="p-6 bg-white border border-brand-beige rounded-[32px] flex flex-col items-center gap-3 hover:border-brand-gold hover:shadow-lg transition-all group"
                    >
                      <Icon className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown text-center">{t(cat)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {packageItems.length > 0 && (
              <div className="mt-20 p-12 bg-brand-brown rounded-[48px] shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-8">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.3em]">Consolidated Package Total</span>
                  <h2 className="text-5xl font-serif italic text-brand-ivory mt-2">
                    {packageItems.reduce((acc, item) => acc + (item.totalAmount * item.quantity), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs not-italic">AED</span>
                  </h2>
                </div>
                <button 
                  onClick={() => {
                    alert(t('Generating package quote message'));
                  }}
                  className="px-12 py-6 bg-brand-gold text-brand-ivory rounded-[32px] font-bold uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-brand-gold/90 transition-all flex items-center gap-4 group"
                >
                  {t('Generate Package Quote')} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-7xl mx-auto px-6 w-full">
           <div className="text-center space-y-4 mb-20">
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-brand-gold/30" />
              <div className="flex items-center gap-2 text-brand-gold">
                <Cpu className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em]">AI Mapping Engine Activated</span>
              </div>
              <div className="h-px w-12 bg-brand-gold/30" />
            </div>
            <h2 className="text-4xl font-serif italic text-brand-brown">项目草稿清单 Project Package Draft</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold opacity-80">Classified items waiting for configuration push</p>
          </div>

          {draftItems.length === 0 ? (
            <div className="text-center py-40 bg-brand-beige/10 rounded-[64px] border border-brand-beige/50">
              <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-8">
                <FileSpreadsheet className="w-10 h-10 text-brand-gold/40" />
              </div>
              <p className="text-brand-brown font-serif italic text-xl mb-4 italic opacity-60">Upload a client Excel to populate this workspace</p>
              <button 
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                className="px-10 py-5 bg-brand-brown text-brand-ivory rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                {t('Select a file')}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[48px] border border-brand-beige shadow-2xl shadow-brand-brown/5 overflow-hidden">
              <div className="w-full overflow-x-hidden">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-brand-beige text-brand-brown-muted font-bold uppercase tracking-widest text-[9px] border-b border-brand-beige shadow-sm">
                      <th className="p-8 py-6 w-[60px]">ID</th>
                      <th className="p-8 py-6 w-[220px]">{t('Original Item Name')}</th>
                      <th className="p-8 py-6 w-[200px]">{t('Original Specification')}</th>
                      <th className="p-8 py-6 w-[240px]">{t('AI Suggested Category')}</th>
                      <th className="p-8 py-6 w-[100px]">{t('Qty')}</th>
                      <th className="p-8 py-6 w-[120px]">{t('Status')}</th>
                      <th className="p-8 py-6 text-right w-[340px] whitespace-nowrap">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-beige/30">
                    {draftItems.map((item, idx) => (
                      <tr key={item.id} className="group hover:bg-brand-gold/5 transition-colors">
                        <td className="p-8 text-[10px] font-mono text-brand-brown-muted opacity-50">#{idx + 1}</td>
                        <td className="p-8">
                          <p className="font-bold text-brand-brown text-sm truncate" title={item.originalName}>{item.originalName}</p>
                        </td>
                        <td className="p-8 text-brand-brown-muted">
                          <p className="line-clamp-2 text-[10px]" title={item.originalSpec}>{item.originalSpec}</p>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-brand-beige/20 flex items-center justify-center shrink-0">
                              {item.suggestedCategory !== 'unknown' ? (
                                (() => {
                                  const Icon = CATEGORY_ICONS[item.suggestedCategory as FurnitureCategory];
                                  return <Icon className="w-4 h-4 text-brand-gold" />;
                                })()
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-300" />
                              )}
                            </div>
                            <select 
                              value={item.suggestedCategory}
                              onChange={(e) => {
                                const updated = [...draftItems];
                                updated[idx].suggestedCategory = e.target.value as FurnitureCategory;
                                if (updated[idx].status === 'Need Review') updated[idx].status = 'Confirmed';
                                setDraftItems(updated);
                              }}
                              className="bg-transparent border-none font-bold text-brand-brown text-[10px] uppercase tracking-widest outline-none focus:ring-0 cursor-pointer hover:text-brand-gold transition-colors truncate max-w-[150px]"
                            >
                              <option value="unknown">Select...</option>
                              {Object.values(FurnitureCategory).map(cat => (
                                <option key={cat} value={cat}>{t(cat)}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-8 font-mono font-bold text-brand-brown whitespace-nowrap">{item.quantity} {item.unit}</td>
                        <td className="p-8">
                          <span className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit whitespace-nowrap ${
                            item.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                            item.status === 'Need Split' ? 'bg-orange-100 text-orange-700' :
                            'bg-brand-gold/10 text-brand-gold'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${
                              item.status === 'Confirmed' ? 'bg-green-700' :
                              item.status === 'Need Split' ? 'bg-orange-700' :
                              'bg-brand-gold'
                            }`} />
                            {t(item.status)}
                          </span>
                        </td>
                        <td className="p-8">
                           <div className="flex items-center justify-end gap-3">
                             <button 
                               onClick={() => {
                                 setItemToSplit(item);
                                 setSplitResult([{ ...item, id: `${item.id}-1` }, { ...item, id: `${item.id}-2` }]);
                                 setShowSplitModal(true);
                               }}
                               disabled={item.status !== 'Need Split'}
                               className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                                 item.status === 'Need Split' 
                                 ? 'bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white' 
                                 : 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                               }`}
                               title={item.status !== 'Need Split' ? t('Item does not need splitting') : ''}
                             >
                               {t('Split / 拆分')}
                             </button>

                             <button 
                               onClick={() => {
                                 const updated = [...draftItems];
                                 updated[idx].status = 'Confirmed';
                                 setDraftItems(updated);
                                 alert(t('Successfully confirmed category'));
                               }}
                               disabled={item.status === 'Confirmed'}
                               className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                                 item.status !== 'Confirmed' 
                                 ? 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white' 
                                 : 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                               }`}
                             >
                               {t('Confirm / 确认')}
                             </button>

                             {item.suggestedCategory === FurnitureCategory.OTHER ? (
                               <button 
                                 onClick={() => handlePushToConfigurator(item)}
                                 disabled={item.status !== 'Confirmed'}
                                 className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                                   item.status === 'Confirmed' 
                                   ? 'bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-white' 
                                   : 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                                 }`}
                               >
                                 {t('Add / 加入')}
                               </button>
                             ) : (
                               <button 
                                 onClick={() => handlePushToConfigurator(item)}
                                 disabled={item.status !== 'Confirmed' || item.suggestedCategory === 'unknown'}
                                 className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                                    item.status === 'Confirmed' && item.suggestedCategory !== 'unknown'
                                    ? 'bg-brand-brown text-brand-ivory hover:bg-brand-brown/90 shadow-md' 
                                    : 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                                 }`}
                               >
                                 {t('Configure / 配置')}
                               </button>
                             )}

                             <button 
                               onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))}
                               className="px-4 py-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[9px] font-bold uppercase tracking-widest"
                             >
                               {t('Ignore / 忽略')}
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-12 bg-brand-beige/5 border-t border-brand-beige flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <FileSpreadsheet className="w-6 h-6 text-brand-gold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-brown uppercase tracking-widest">Client Draft Summary</h4>
                    <p className="text-[10px] text-brand-brown-muted uppercase font-bold opacity-60">
                      Total Items: {draftItems.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <button 
                    onClick={() => {
                        const confirmed = draftItems.filter(it => it.status === 'Confirmed');
                        if (confirmed.length === 0) {
                          alert(t('Please confirm items before batch adding.'));
                          return;
                        }

                        const newItems: PackageItem[] = confirmed.map(item => {
                          const isOther = item.suggestedCategory === FurnitureCategory.OTHER;
                          return {
                            id: `batch-${item.id}-${Date.now()}`,
                            category: item.suggestedCategory as FurnitureCategory,
                            config: { ...genericConfig },
                            quantity: item.quantity,
                            bom: isOther ? [{
                              component: item.originalName,
                              quantity: item.quantity,
                              unit: item.unit,
                              unitPrice: item.targetUnitPrice,
                              total: item.targetTotal
                            }] : [],
                            totalAmount: isOther ? item.targetUnitPrice : 0 // Non-other items need config to get price
                          };
                        });

                        setPackageItems([...packageItems, ...newItems]);
                        setDraftItems(draftItems.filter(it => it.status !== 'Confirmed'));
                        setActiveTab('items');
                        alert(t('Added confirmed items to Project Package. Please configure non-furniture items individually.'));
                    }}
                    className="px-10 py-5 bg-brand-brown text-brand-ivory rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-brand-brown/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     {t('Batch Add to Package')}
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCategorySelection = () => (
    <div className="space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex justify-start">
        <button 
          onClick={() => setProjectInfoSubmitted(false)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:text-brand-brown transition-all group"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> {t('Back to Project Info')}
        </button>
      </div>

      <div className="space-y-16">
        {/* Section 1: Individual Items — only shown for 'custom' path (or no path set) */}
        {quoteType !== 'package' && (
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif italic text-brand-brown">{t('Individual Item Quote')}</h2>
            <div className="w-24 h-px bg-brand-gold/30 mx-auto" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">Custom-made furniture &amp; engineering items</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {Object.values(FurnitureCategory).map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setQuoteMode('single');
                    setSelectedCategory(cat);
                    setCurrentStep(0);
                  }}
                  className="group p-10 bg-white border border-brand-beige rounded-[48px] flex flex-col items-center gap-6 hover:border-brand-gold shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                >
                  <div className="p-6 bg-brand-beige/20 rounded-[32px] group-hover:bg-brand-gold/10 group-hover:-rotate-6 transition-all duration-500">
                    <Icon className="w-8 h-8 text-brand-gold" />
                  </div>
                  <span className="text-lg font-serif italic text-brand-brown group-hover:text-brand-gold transition-colors">{t(cat)}</span>
                </button>
              );
            })}
          </div>
        </section>
        )} {/* end quoteType !== 'package' */}

        {/* Section 2: Project Packages — only shown for 'package' path (or no path set) */}
        {quoteType !== 'custom' && (
        <section className="space-y-8 pt-12 border-t border-brand-beige/50">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif italic text-brand-brown">{t('Project Package Quote')}</h2>
            <div className="w-24 h-px bg-brand-gold/30 mx-auto" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">Consolidated furniture bundles by environment</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {Object.values(Scenario).map(s => {
              const Icon = SCENARIO_ICONS[s];
              return (
                <button
                  key={s}
                  onClick={() => {
                    setQuoteMode('package');
                    handleScenarioSelect(s);
                  }}
                  className="group p-8 bg-brand-beige/5 border border-brand-beige/60 rounded-[40px] flex flex-col items-center text-center gap-5 hover:bg-white hover:border-brand-gold hover:shadow-xl transition-all duration-500"
                >
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8 text-brand-gold" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-serif italic text-brand-brown">{t(s)} {t('Bundle')}</h4>
                    <p className="text-[9px] font-bold text-brand-gold uppercase tracking-widest">{t('Full Set Quote')}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        )} {/* end quoteType !== 'custom' */}
      </div>
    </div>
  );

  const renderRequirementInfo = () => {
    const currentConfig = 
      selectedCategory === FurnitureCategory.BED ? config :
      selectedCategory === FurnitureCategory.SOFA ? sofaConfig :
      selectedCategory === FurnitureCategory.CHAIR ? chairConfig :
      selectedCategory === FurnitureCategory.DINING_TABLE ? diningTableConfig :
      selectedCategory === FurnitureCategory.WARDROBE || selectedCategory === FurnitureCategory.CABINET || selectedCategory === FurnitureCategory.TV_UNIT ? modularConfig :
      genericConfig;

    const notes = (currentConfig as any).notes;
    const specOverride = selectedCategory === FurnitureCategory.SOFA ? (currentConfig as any).sofaType : '';

    if (!notes && !specOverride) return null;
    if (STEPS[currentStep].id === 'summary') return null;

    return (
      <div className="mb-8 p-6 bg-brand-gold/5 border border-brand-gold/20 rounded-3xl space-y-4">
        <h4 className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.25em] flex items-center gap-2">
           <Info className="w-3 h-3" /> {t('Split Requirement Info')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
           {specOverride && (
             <div className="space-y-1">
               <span className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Type / Specification')}</span>
               <p className="text-sm font-serif italic text-brand-brown">{specOverride}</p>
             </div>
           )}
           {notes && (
             <div className="space-y-1">
               <span className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Notes')}</span>
               <p className="text-sm text-brand-brown-muted">{notes}</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderStep = () => {
    const stepId = STEPS[currentStep].id;

    if (stepId === 'summary') {
      const currentConfig = 
        selectedCategory === FurnitureCategory.BED ? config :
        selectedCategory === FurnitureCategory.SOFA ? sofaConfig :
        selectedCategory === FurnitureCategory.CHAIR ? chairConfig :
        selectedCategory === FurnitureCategory.DINING_TABLE ? diningTableConfig :
        selectedCategory === FurnitureCategory.WARDROBE || selectedCategory === FurnitureCategory.CABINET || selectedCategory === FurnitureCategory.TV_UNIT ? modularConfig :
        genericConfig;

      return (
        <div className="space-y-12 text-sans">
           <div className="bg-brand-beige/10 p-10 rounded-[40px] border border-brand-beige">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown mb-8 flex items-center gap-2 italic">
               <FileText className="w-3 h-3 text-brand-gold" /> {t('Quotation Details')}
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {[
                  { key: 'customerProjectName', label: t('Customer / Project') },
                  { key: 'phoneWhatsApp', label: t('Phone / WA Phone') },
                  { key: 'salesperson', label: t('Staff') },
                  { key: 'quoteNumber', label: t('Ref No') },
                  { key: 'date', label: t('Date'), type: 'date' }
                ].map(field => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.1em]">{field.label}</label>
                    <input 
                      type={field.type || 'text'}
                      value={quoteInfo[field.key as keyof typeof quoteInfo]} 
                      onChange={e => setQuoteInfo({...quoteInfo, [field.key]: e.target.value})}
                      className="w-full bg-transparent border-b border-brand-brown/10 py-1 text-sm font-medium focus:border-brand-gold outline-none"
                    />
                  </div>
                ))}
             </div>
           </div>

           <div className="bg-white p-6 sm:p-12 rounded-[48px] border border-brand-beige">
               <div className="space-y-12">
                <section className="bg-brand-beige/5 p-8 rounded-[32px] border border-brand-beige/30">
                  <h4 className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                     <Settings className="w-3 h-3 text-brand-gold" /> {t('Project Overview')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-4 text-xs">
                     <div className="flex justify-between border-b border-brand-beige/50 pb-2">
                       <span className="text-brand-brown-muted">{t('Category')}</span>
                       <span className="font-bold">{t(selectedCategory!)}</span>
                     </div>
                     <div className="flex justify-between border-b border-brand-beige/50 pb-2">
                       <span className="text-brand-brown-muted">{t('Scenario')}</span>
                       <span className="font-bold">{selectedScenario ? t(selectedScenario) : 'Generic'}</span>
                     </div>
                     <div className="flex justify-between border-b border-brand-beige/50 pb-2">
                       <span className="text-brand-brown-muted">{t('Finish')}</span>
                       <span className="font-bold">{(currentConfig as any).finish ? t((currentConfig as any).finish) : 'N/A'}</span>
                     </div>
                     <div className="flex justify-between border-b border-brand-beige/50 pb-2">
                       <span className="text-brand-brown-muted">{t('Color Way')}</span>
                       <span className="font-bold">{currentConfig.color === Color.CUSTOM ? `Custom` : t(currentConfig.color)}</span>
                     </div>
                  </div>
                </section>

                <section className="bg-brand-brown p-8 rounded-[32px] text-brand-ivory">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                     <Square className="w-3 h-3 text-brand-gold" /> {t('Product Summary')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {selectedCategory === FurnitureCategory.WARDROBE || selectedCategory === FurnitureCategory.CABINET || selectedCategory === FurnitureCategory.TV_UNIT ? (
                      modularConfig.modules.map((m, idx) => (
                        <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-[9px] uppercase tracking-widest text-brand-gold/60 font-bold mb-1">Module {idx + 1}</p>
                          <p className="font-serif italic text-lg">{t(m.type)}</p>
                          <p className="text-xs opacity-60 mt-2">{m.width}x{m.height}x{m.depth}mm</p>
                          <p className="text-xs font-bold mt-1 text-brand-gold">QTY: {m.quantity}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[9px] uppercase tracking-widest text-brand-gold/60 font-bold mb-1">Primary Unit</p>
                        <p className="font-serif italic text-lg">{t(selectedCategory!)}</p>
                        <p className="text-xs font-bold mt-1 text-brand-gold">QTY: 1</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h4 className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-[0.25em] flex items-center gap-3">
                       <Package className="w-3 h-3 text-brand-gold" /> {t('BOM Breakdown')}
                    </h4>
                  </div>
                  
                  <div className="space-y-12">
                    {Object.entries(
                      bom.reduce((acc, item) => {
                        const group = item.group || 'Standard Items';
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(item);
                        return acc;
                      }, {} as Record<string, typeof bom>)
                    ).map(([groupName, items], gIdx) => (
                      <div key={gIdx} className="space-y-4">
                        <h5 className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.3em] border-l-2 border-brand-gold pl-3">{groupName}</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] text-left">
                            <thead>
                              <tr className="border-b border-brand-beige text-brand-brown/40 font-bold uppercase tracking-widest">
                                <th className="pb-3 px-2">{t('Component')}</th>
                                <th className="pb-3 text-center px-2">{t('Qty')}</th>
                                <th className="pb-3 text-right px-2">{t('Rate')}</th>
                                <th className="pb-3 text-right px-2">{t('Subtotal')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-beige/30">
                              {(items as any[]).map((item: any, iIdx) => (
                                <tr key={iIdx}>
                                  <td className="py-4 px-2 font-medium text-brand-brown">{item.component}</td>
                                  <td className="py-4 text-center px-2 text-brand-brown-muted font-mono">{item.quantity} {item.unit}</td>
                                  <td className="py-4 text-right px-2 text-brand-brown-muted font-mono">{item.unitPrice.toLocaleString()}</td>
                                  <td className="py-4 text-right px-2 font-bold text-brand-brown font-mono">{item.total.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-brand-beige/5 font-bold">
                                <td colSpan={3} className="py-3 text-right text-[9px] uppercase tracking-widest px-2">Module Subtotal</td>
                                <td className="py-3 text-right text-brand-brown font-mono px-2">
                                  {(items as any[]).reduce((sum: number, i: any) => sum + i.total, 0).toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 pt-8 border-t-4 border-brand-brown">
                    <div className="flex justify-between items-center bg-brand-beige/10 p-6 rounded-2xl">
                      <span className="text-[10px] font-bold text-brand-brown uppercase tracking-[0.3em]">{t('Total Materials Subtotal')}</span>
                      <span className="text-3xl font-serif italic text-brand-brown">{costs.material.toLocaleString()} <span className="text-[10px] font-sans font-bold uppercase tracking-widest not-italic ml-2 font-mono">AED</span></span>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-16 pt-12 border-t border-brand-beige">
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-bold text-brand-brown uppercase tracking-[0.2em] mb-4 italic">{t('Operational Overheads')}</h4>
                     <div className="space-y-3 text-xs">
                       {[
                         { label: t('Labor'), key: 'labor' },
                         { label: t('Packaging'), key: 'packaging' },
                         { label: t('Transport'), key: 'transport' },
                         { label: t('Installation'), key: 'installation' },
                       ].map(field => (
                         <div key={field.key} className="flex justify-between items-center border-b border-brand-beige pb-2">
                           <span className="text-brand-brown-muted font-medium">{field.label}</span>
                           <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               value={costOverrides[field.key as keyof typeof costOverrides]} 
                               onChange={e => setCostOverrides(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                               className="w-20 bg-brand-beige/20 text-right font-mono text-brand-brown px-2 py-1 rounded focus:outline-none focus:bg-brand-gold/10 transition-colors"
                             />
                             <span className="text-[9px] opacity-40">AED</span>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-bold text-brand-brown uppercase tracking-[0.2em] mb-4 italic">{t('Financial Summary')}</h4>
                     <div className="space-y-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-brand-brown-muted">{t('Margin (%)')}</span>
                          <input 
                            type="number" 
                            value={costOverrides.marginPercent} 
                            onChange={e => setCostOverrides(prev => ({ ...prev, marginPercent: Number(e.target.value) }))}
                            className="w-16 bg-brand-beige/20 text-right font-mono text-brand-brown px-2 py-1 rounded focus:outline-none focus:bg-brand-gold/10 transition-colors"
                          />
                       </div>
                       <div className="flex justify-between text-xs pt-1 border-t border-brand-beige/30">
                         <span className="text-brand-brown-muted italic">{t('Margin Amt')}</span>
                         <span className="font-mono text-brand-brown font-bold">{costs.margin.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-sm pt-6 font-bold border-t border-brand-brown/10 mt-4">
                         <span className="uppercase tracking-widest text-[10px]">{t('Net (Excl. VAT)')}</span>
                         <span className="font-mono text-brand-brown">{(costs.total / (1 + costOverrides.vatPercent/100)).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] text-brand-brown-muted italic mt-1 font-medium">
                         <span>{t('VAT (%)')}</span>
                         <input 
                            type="number" 
                            value={costOverrides.vatPercent} 
                            onChange={e => setCostOverrides(prev => ({ ...prev, vatPercent: Number(e.target.value) }))}
                            className="w-14 bg-brand-beige/10 text-right font-mono italic px-2 py-0.5 rounded focus:outline-none"
                          />
                       </div>
                       <div className="flex justify-between text-[10px] text-brand-brown-muted italic font-medium">
                         <span>{t('VAT Amt')}</span>
                         <span className="font-mono italic">{costs.vat.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                       </div>
                       <div className="mt-8 p-6 bg-brand-brown text-brand-ivory rounded-[32px] flex justify-between items-center shadow-2xl shadow-brand-brown/20 border border-brand-gold/30 transition-all duration-700">
                          <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('Gross Quote')}</span>
                          <span className="text-3xl font-serif italic tracking-tighter text-brand-gold">{costs.total.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm not-italic opacity-60">AED</span></span>
                       </div>
                     </div>
                  </div>
                </section>
              </div>
           </div>

            {/* Step 5 marker — final action row */}
            <div className="flex items-center gap-2 justify-center mb-3">
              <div className="h-px flex-1 bg-[#0C1B3A]/8" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#C9A84C] px-3">Step 5 · Final Actions</span>
              <div className="h-px flex-1 bg-[#0C1B3A]/8" />
            </div>

            <div className="flex flex-col sm:flex-row gap-5 max-w-2xl mx-auto w-full">
              {quoteMode === 'package' ? (
                <button
                  onClick={addToPackage}
                  className="flex-1 p-6 rounded-[28px] bg-brand-gold text-brand-ivory flex justify-center items-center gap-4 font-bold uppercase tracking-widest text-xs shadow-xl shadow-brand-gold/20 hover:bg-brand-gold/90 transition-all active:scale-95 group"
                >
                  <PlusCircle className="w-5 h-5 text-white group-hover:scale-110 transition-transform" /> {t('Add to Project Package')}
                </button>
              ) : (
                <button onClick={saveToHistory} className="flex-1 p-6 rounded-[28px] bg-white border border-brand-gold text-brand-brown flex justify-center items-center gap-4 font-bold uppercase tracking-widest text-xs hover:bg-brand-gold/10 transition-all active:scale-95 group">
                  <Archive className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" /> {t('Save Record')}
                </button>
              )}
             <button onClick={() => window.print()} className="flex-1 p-6 rounded-[28px] bg-white border border-brand-brown text-brand-brown flex justify-center items-center gap-4 font-bold uppercase tracking-widest text-xs hover:bg-brand-beige/30 transition-all active:scale-95 group">
               <Printer className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" /> {t('Print Spec')}
             </button>
             <button onClick={generatePDF} className="flex-1 p-6 rounded-[28px] bg-white border border-brand-gold text-brand-gold flex justify-center items-center gap-4 font-bold uppercase tracking-widest text-xs hover:bg-brand-gold/10 transition-all active:scale-95 group">
               <Download className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" /> {t('Download PDF')}
             </button>
             <button onClick={() => alert(t('Quotation sent message'))} className="flex-1 p-6 rounded-[28px] bg-brand-brown text-brand-ivory flex justify-center items-center gap-4 font-bold uppercase tracking-widest text-xs shadow-xl shadow-brand-brown/20 hover:bg-brand-brown/90 transition-all active:scale-95 group">
               <Download className="w-5 h-5 text-brand-gold group-hover:translate-y-1 transition-transform" /> {t('Sync to CRM')}
             </button>
             <button onClick={sendToTrade} className="flex-1 p-6 rounded-[28px] bg-[#0C1B3A] text-[#C9A84C] flex justify-center items-center gap-4 font-bold uppercase tracking-widest text-xs shadow-xl hover:bg-[#0F2551] transition-all active:scale-95 group border border-[#C9A84C]/30">
               <ExternalLink className="w-5 h-5 text-[#C9A84C] group-hover:translate-x-1 transition-transform" /> Send to TRADE
             </button>
             {/* Print Only View (English) */}
            <div id="quotation-print" className="hidden print:block p-10 bg-white text-black font-sans">
              <div className="border-b-2 border-brand-brown pb-6 mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-serif italic text-brand-brown">GCI LIVING</h1>
                  <p className="text-[10px] uppercase tracking-widest text-brand-brown-muted mt-1">{tPDF('QUOTATION')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">{tPDF('Quotation No.')}: {quoteInfo.quoteNumber}</p>
                  <p className="text-[10px] text-gray-500">{tPDF('Date')}: {new Date(quoteInfo.date).toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              <section className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">{tPDF('CLIENT INFORMATION')}</h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500 uppercase text-[8px] font-bold">{tPDF('Customer / Project Name')}</p>
                    <p className="font-medium">{quoteInfo.customerProjectName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-[8px] font-bold">{tPDF('Phone / WhatsApp')}</p>
                    <p className="font-medium">{quoteInfo.phoneWhatsApp || 'N/A'}</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">{tPDF('PRODUCT SPECIFICATION')}</h2>
                <div className="grid grid-cols-3 gap-6 text-xs">
                  <div>
                    <p className="text-gray-500 uppercase text-[8px] font-bold">{tPDF('Category')}</p>
                    <p className="font-medium">{tPDF(selectedCategory!)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-[8px] font-bold">{tPDF('Scenario')}</p>
                    <p className="font-medium">{tPDF(selectedScenario!)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-[8px] font-bold">{tPDF('Color')}</p>
                    <p className="font-medium">{config.color === Color.CUSTOM ? (config.customColor || 'Custom') : tPDF(config.color)}</p>
                  </div>
                </div>
              </section>

              <table className="w-full text-xs mb-8 border-collapse">
                <thead>
                  <tr className="bg-gray-50 uppercase text-[8px] font-bold tracking-widest">
                    <th className="border p-2 text-left">{tPDF('Component')}</th>
                    <th className="border p-2 text-left">{tPDF('Specification')}</th>
                    <th className="border p-2 text-center">{tPDF('Qty')}</th>
                    <th className="border p-2 text-right">{tPDF('Rate')}</th>
                    <th className="border p-2 text-right">{tPDF('Subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((item, i) => (
                    <tr key={i}>
                      <td className="border p-2">{tPDF(item.component.split(':')[0])}</td>
                      <td className="border p-2">{item.component.split(':')[1] ? tPDF(item.component.split(':')[1].trim()) : 'Standard'}</td>
                      <td className="border p-2 text-center">{item.quantity} {tPDF(item.unit)}</td>
                      <td className="border p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                      <td className="border p-2 text-right">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>{tPDF('Material')}</span>
                    <span>{costs.material.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-gray-100 pb-2 mb-2">
                    <span>{tPDF('Labor / Logistics')}</span>
                    <span>{(costs.labor + costs.packaging + costs.transport + costs.installation).toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm bg-gray-50 p-2">
                    <span>{tPDF('Gross Quote')}</span>
                    <span>{costs.total.toLocaleString()} AED</span>
                  </div>
                  <p className="text-[8px] text-gray-400 mt-4 text-center">
                    GCI LIVING - {tPDF('Commercial Grade')} | {tPDF('Verified Status')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedCategory === FurnitureCategory.CHAIR) {
      switch (stepId) {
        case 'dimensions':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Ruler className="w-3 h-3 text-brand-gold" /> 尺寸规格 (mm)
              </h3>
              <div className="grid grid-cols-1 gap-8">
                {[
                  { label: t('Width Label'), key: 'width' },
                  { label: t('Depth Label'), key: 'depth' },
                  { label: t('Seat Height Label'), key: 'seatHeight' },
                  { label: t('Back Height Label'), key: 'backHeight' }
                ].map(f => (
                  <div key={f.key} className="space-y-3">
                    <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em]">{f.label}</label>
                    <input
                      type="number"
                      value={chairConfig[f.key as keyof ChairConfiguration] as number}
                      onChange={e => updateChairConfig({ [f.key]: Number(e.target.value) })}
                      className="w-full bg-transparent border-b border-brand-brown/10 text-2xl font-serif italic text-brand-brown focus:border-brand-gold outline-none pb-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        case 'type':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layout className="w-3 h-3 text-brand-gold" /> {t('Chair Type')}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.values(ChairType).map(tVal => (
                  <button
                    key={tVal}
                    onClick={() => updateChairConfig({ type: tVal })}
                    className={`p-10 text-left border rounded-[32px] font-bold text-xs uppercase tracking-widest transition-all relative group ${chairConfig.type === tVal ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="block text-xl font-serif italic">{t(tVal)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        case 'frame':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Square className="w-3 h-3 text-brand-gold" /> {t('Frame Material')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[Material.SOLID_WOOD, Material.METAL, Material.PLYWOOD].map(m => (
                  <button
                    key={m}
                    onClick={() => updateChairConfig({ frameMaterial: m })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.frameMaterial === m ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'legs':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Columns className="w-3 h-3 text-brand-gold" /> {t('Leg Type')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(LegType).map(l => (
                  <button
                    key={l}
                    onClick={() => updateChairConfig({ legType: l })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.legType === l ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(l)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'backrest':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layers className="w-3 h-3 text-brand-gold" /> {t('Backrest')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(BackrestType).map(b => (
                  <button
                    key={b}
                    onClick={() => updateChairConfig({ backrest: b })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.backrest === b ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(b)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'seat':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Archive className="w-3 h-3 text-brand-gold" /> {t('Seat')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(SeatType).map(s => (
                  <button
                    key={s}
                    onClick={() => updateChairConfig({ seat: s })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.seat === s ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'upholstery':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Upholstery')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(SofaUpholsteryType).map(u => (
                  <button
                    key={u}
                    onClick={() => updateChairConfig({ upholstery: u })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.upholstery === u ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(u)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'armrest':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Trello className="w-3 h-3 text-brand-gold" /> {t('Armrest')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(ArmrestType).map(a => (
                  <button
                    key={a}
                    onClick={() => updateChairConfig({ armrest: a })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.armrest === a ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(a)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'finish':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Finish')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(FinishType).map(f => (
                  <button
                    key={f}
                    onClick={() => updateChairConfig({ finish: f })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${chairConfig.finish === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(f)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'color':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Color')}
              </h3>
              <div className="grid grid-cols-5 gap-4">
                {Object.values(Color).map(c => (
                  <button
                    key={c}
                    onClick={() => updateChairConfig({ color: c })}
                    className={`h-16 rounded-3xl border-2 transition-all flex items-center justify-center relative group ${chairConfig.color === c ? 'border-brand-gold scale-110 shadow-lg' : 'border-transparent hover:border-brand-beige'}`}
                    style={{ backgroundColor: c === Color.WHITE ? '#FFFFFF' : c === Color.BEIGE ? '#F5F5DC' : c === Color.WALNUT ? '#5D4037' : c === Color.GREY ? '#808080' : '#CCCCCC' }}
                  >
                    {chairConfig.color === c && <PlusCircle className={`w-4 h-4 ${c === Color.WHITE || c === Color.BEIGE ? 'text-brand-gold' : 'text-brand-ivory'}`} />}
                  </button>
                ))}
              </div>
              {chairConfig.color === Color.CUSTOM && (
                <div className="mt-8 p-6 bg-white border border-brand-beige rounded-[32px]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block mb-2">Custom Color RAL/Pantone</label>
                  <input
                    type="text"
                    value={chairConfig.customColor || ''}
                    onChange={e => updateChairConfig({ customColor: e.target.value })}
                    className="w-full bg-transparent border-b border-brand-beige py-2 px-1 focus:border-brand-gold outline-none"
                    placeholder="e.g. RAL 7016"
                  />
                </div>
              )}
            </div>
          );
        case 'addons':
          return (
            <div className="space-y-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <PlusCircle className="w-3 h-3 text-brand-gold" /> {t('Add-ons')}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.values(AddOn).map(a => (
                  <button
                    key={a}
                    onClick={() => toggleChairAddOn(a)}
                    className={`p-8 text-left border rounded-[32px] flex justify-between items-center transition-all ${chairConfig.addOns.includes(a) ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl' : 'bg-white text-brand-brown border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="text-xl font-serif italic">{t(a)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        default: return null;
      }
    }

    if (selectedCategory === FurnitureCategory.DINING_TABLE) {
      switch (stepId) {
        case 'shape':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layout className="w-3 h-3 text-brand-gold" /> {t('Shape')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(TableShape).map(s => (
                  <button
                    key={s}
                    onClick={() => updateDiningTableConfig({ shape: s })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${diningTableConfig.shape === s ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'material':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layers className="w-3 h-3 text-brand-gold" /> {t('Top Material')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[Material.SOLID_WOOD, Material.MARBLE, Material.GLASS, Material.PLYWOOD].map(m => (
                  <button
                    key={m}
                    onClick={() => updateDiningTableConfig({ topMaterial: m })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${diningTableConfig.topMaterial === m ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em] mb-3 block">{t('Thickness_Label')} (mm)</label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(Thickness).map(th => (
                    <button
                      key={th}
                      onClick={() => updateDiningTableConfig({ thickness: th })}
                      className={`p-4 border rounded-xl text-[10px] font-bold ${diningTableConfig.thickness === th ? 'bg-brand-gold text-white' : 'bg-white text-brand-brown border-brand-beige'}`}
                    >
                      {t(th)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        case 'legs':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Columns className="w-3 h-3 text-brand-gold" /> {t('Base/Legs')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(TableBaseType).map(b => (
                  <button
                    key={b}
                    onClick={() => updateDiningTableConfig({ baseType: b })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${diningTableConfig.baseType === b ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(b)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'edge':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Ruler className="w-3 h-3 text-brand-gold" /> {t('Edge Treatment')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(EdgeTreatment).map(e => (
                  <button
                    key={e}
                    onClick={() => updateDiningTableConfig({ edge: e })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${diningTableConfig.edge === e ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(e)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'dimensions':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Ruler className="w-3 h-3 text-brand-gold" /> {t('Dimensions (mm)')}
              </h3>
              <div className="grid grid-cols-1 gap-8">
                {[
                  { label: t('Length Label'), key: 'length' },
                  { label: t('Width Label'), key: 'width' },
                  { label: t('Height Label'), key: 'height' }
                ].map(f => (
                  <div key={f.key} className="space-y-3">
                    <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em]">{f.label}</label>
                    <input
                      type="number"
                      value={diningTableConfig[f.key as keyof DiningTableConfiguration] as number}
                      onChange={e => updateDiningTableConfig({ [f.key]: Number(e.target.value) })}
                      className="w-full bg-transparent border-b border-brand-brown/10 text-2xl font-serif italic text-brand-brown focus:border-brand-gold outline-none pb-2"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em] mb-3 block">{t('Thickness_Label')} (mm)</label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(Thickness).map(th => (
                    <button
                      key={th}
                      onClick={() => updateDiningTableConfig({ thickness: th })}
                      className={`p-4 border rounded-xl text-[10px] font-bold ${diningTableConfig.thickness === th ? 'bg-brand-gold text-white' : 'bg-white text-brand-brown border-brand-beige'}`}
                    >
                      {t(th)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        case 'finish':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Project Finish')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(FinishType).map(f => (
                  <button
                    key={f}
                    onClick={() => updateDiningTableConfig({ finish: f })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${diningTableConfig.finish === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(f)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'color':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> 颜色方案 Color
              </h3>
              <div className="grid grid-cols-5 gap-4">
                {Object.values(Color).map(c => (
                  <button
                    key={c}
                    onClick={() => updateDiningTableConfig({ color: c })}
                    className={`h-16 rounded-3xl border-2 transition-all flex items-center justify-center relative group ${diningTableConfig.color === c ? 'border-brand-gold scale-110 shadow-lg' : 'border-transparent hover:border-brand-beige'}`}
                    style={{ backgroundColor: c === Color.WHITE ? '#FFFFFF' : c === Color.BEIGE ? '#F5F5DC' : c === Color.WALNUT ? '#5D4037' : c === Color.GREY ? '#808080' : '#CCCCCC' }}
                  >
                    {diningTableConfig.color === c && <PlusCircle className={`w-4 h-4 ${c === Color.WHITE || c === Color.BEIGE ? 'text-brand-gold' : 'text-brand-ivory'}`} />}
                  </button>
                ))}
              </div>
            </div>
          );
        default: return null;
      }
    }

    if ([FurnitureCategory.WARDROBE, FurnitureCategory.CABINET, FurnitureCategory.TV_UNIT].includes(selectedCategory!)) {
      if (stepId === 'modules') {
        return (
          <div className="space-y-12">
            <div className="flex justify-between items-center bg-brand-beige/10 p-6 rounded-[32px] border border-brand-beige">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layout className="w-3 h-3 text-brand-gold" /> {t('Module Management')}
              </h3>
                <p className="text-[8px] text-brand-brown-muted uppercase tracking-widest italic">Add multiple components to build your custom storage system</p>
              </div>
              <button 
                onClick={handleAddModule}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-brand-gold text-brand-ivory text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gold/90 transition-all shadow-xl shadow-brand-gold/20 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" /> {t('Add Module')}
              </button>
            </div>

            <div className="space-y-6">
              {modularConfig.modules.length === 0 ? (
                <div className="py-24 border-2 border-dashed border-brand-beige rounded-[48px] text-center space-y-6 bg-brand-beige/5">
                  <div className="w-20 h-20 bg-brand-beige/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-brand-gold/40" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-brand-brown font-serif italic text-xl">Empty Configuration</p>
                    <p className="text-brand-brown-muted text-[10px] uppercase tracking-widest font-bold">开始添加模块进行系统设计 Add modules to start designing</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {modularConfig.modules.map((module, idx) => (
                    <motion.div 
                      key={module.id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-10 rounded-[40px] border border-brand-beige shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-brand-gold/10 text-brand-gold text-[8px] font-bold rounded-full uppercase tracking-widest">
                              M-{idx + 1}
                            </span>
                            <span className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.2em]">Qty: {module.quantity}</span>
                          </div>
                          <h4 className="text-2xl font-serif italic text-brand-brown pr-20">{t(module.type)}</h4>
                        </div>
                        <div className="flex gap-3 relative z-20">
                          <button onClick={() => handleDuplicateModule(module)} className="p-3 rounded-2xl bg-brand-beige/20 hover:bg-brand-gold/10 text-brand-brown hover:text-brand-gold transition-all" title="Duplicate"><Layers className="w-4 h-4" /></button>
                          <button onClick={() => handleEditModule(module)} className="p-3 rounded-2xl bg-brand-beige/20 hover:bg-brand-gold/10 text-brand-brown hover:text-brand-gold transition-all" title="Edit"><Settings className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteModule(module.id)} className="p-3 rounded-2xl bg-brand-beige/20 hover:bg-red-50 text-brand-brown hover:text-red-400 transition-all" title="Delete"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-[10px] relative z-10">
                        <div className="space-y-2">
                          <span className="text-brand-brown-muted uppercase font-bold tracking-[0.15em] block opacity-60">Dimensions (mm)</span>
                          <span className="text-brand-brown font-mono text-lg font-medium">{module.width}w × {module.depth}d × {module.height}h</span>
                        </div>
                        <div className="space-y-3">
                          <span className="text-brand-brown-muted uppercase font-bold tracking-[0.15em] block opacity-60">Board Material</span>
                          <div className="space-y-1">
                            <span className="text-brand-brown font-bold block">{t(module.material)}</span>
                            <span className="text-[9px] text-brand-gold italic">{t(module.thickness)} Thickness</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <span className="text-brand-brown-muted uppercase font-bold tracking-[0.15em] block opacity-60">Components</span>
                          <div className="space-y-1">
                             <span className="text-brand-brown block">{module.doorCount}x {t(module.doorType)}</span>
                             {module.hasDrawers && <span className="text-brand-brown block">{module.drawerCount}x {t(module.runnerType)} Drawers</span>}
                             <span className="text-brand-brown block">{module.shelfCount} Shelves</span>
                             {module.hasHangingRail && <span className="text-brand-brown block">Hanging Rail</span>}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <span className="text-brand-brown-muted uppercase font-bold tracking-[0.15em] block opacity-60">Mount / Hardware</span>
                          <div className="space-y-1 text-brand-brown italic">
                            <span>{t(module.mounting)} | {t(module.color)}</span>
                            <span className="block">{t(module.finish)}</span>
                            <span className="block">{t(module.handle)} | {t(module.hingeType)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Subdued BG Decor */}
                      <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-700">
                        <Layout className="w-48 h-48 rotate-12" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    if (selectedCategory === FurnitureCategory.SOFA) {
      switch (stepId) {
        case 'dimensions':
          return (
            <div className="space-y-12">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Ruler className="w-3 h-3 text-brand-gold" /> {t('Sofa Dimensions')} (mm)
              </h3>
              <div className="grid grid-cols-1 gap-8">
                {[
                  { label: t('Overall Length'), key: 'length' },
                  { label: t('Depth'), key: 'depth' },
                  { label: t('Seat Height'), key: 'seatHeight' },
                  { label: t('Back Height'), key: 'backHeight' }
                ].map((field) => (
                  <div key={field.key} className="space-y-3">
                    <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em]">{field.label}</label>
                    <input
                      type="number"
                      value={sofaConfig[field.key as keyof SofaConfiguration] as number}
                      onChange={e => updateSofaConfig({ [field.key]: Number(e.target.value) })}
                      className="w-full bg-transparent border-b border-brand-brown/10 text-2xl font-serif italic text-brand-brown focus:border-brand-gold outline-none pb-2 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        case 'material':
          return (
            <div className="space-y-12">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layers className="w-3 h-3 text-brand-gold" /> {t('Cushion & Foam')}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.values(SofaCushionType).map(m => (
                  <button
                    key={m}
                    onClick={() => updateSofaConfig({ cushionType: m })}
                    className={`p-10 text-left border rounded-[32px] font-bold text-xs uppercase tracking-widest transition-all overflow-hidden relative group ${sofaConfig.cushionType === m ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="block text-xl font-serif italic mb-2">{t(m)}</span>
                    <span className={`text-[10px] opacity-60 ${sofaConfig.cushionType === m ? 'text-brand-gold' : 'text-brand-brown'}`}>+{SOFA_CUSHION_COSTS[m]} AED Base</span>
                    {sofaConfig.cushionType === m && <div className="absolute top-0 right-0 p-4"><PlusCircle className="w-4 h-4 text-brand-gold" /></div>}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'frame':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Square className="w-3 h-3 text-brand-gold" /> {t('Frame')}
              </h3>
              <div className="grid grid-cols-2 gap-5">
                {Object.values(SofaFrameType).map(f => (
                  <button
                    key={f}
                    onClick={() => updateSofaConfig({ frameType: f })}
                    className={`p-10 text-left border rounded-[32px] transition-all relative group ${sofaConfig.frameType === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl' : 'bg-brand-beige/30 text-brand-brown border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="block text-xl font-serif italic mb-2 tracking-tight">{t(f)}</span>
                    <span className={`text-[10px] font-mono opacity-60 ${sofaConfig.frameType === f ? 'text-brand-gold' : 'text-brand-brown'}`}>+{SOFA_FRAME_COSTS[f]} AED</span>
                    {sofaConfig.frameType === f && <div className="absolute top-0 right-0 p-4"><PlusCircle className="w-4 h-4 text-brand-gold" /></div>}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'finish':
          return (
             <div className="space-y-12">
              <section className="space-y-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                  <Palette className="w-3 h-3 text-brand-gold" /> {t('Upholstery')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(SofaUpholsteryType).map(f => (
                    <button
                      key={f}
                      onClick={() => updateSofaConfig({ upholsteryType: f })}
                      className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${sofaConfig.upholsteryType === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                    >
                      {t(f)}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          );
        case 'addons':
           return (
            <div className="space-y-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <PlusCircle className="w-3 h-3 text-brand-gold" /> {t('Add-ons')}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.values(AddOn).map(a => (
                  <button
                    key={a}
                    onClick={() => toggleSofaAddOn(a)}
                    className={`p-8 text-left border rounded-[32px] flex justify-between items-center transition-all ${sofaConfig.addOns.includes(a) ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl translate-x-3' : 'bg-white text-brand-brown border-brand-beige hover:border-brand-gold-muted hover:translate-x-1'}`}
                  >
                    <span className="text-xl font-serif italic">{t(a)}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono font-bold text-brand-brown uppercase tracking-tighter">+{ADDON_COSTS_BASE[a] || 150} AED</span>
                      {sofaConfig.addOns.includes(a) && <X className="w-4 h-4 text-brand-gold opacity-50" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
           );
        default:
          return null;
      }
    }

    if (selectedCategory !== FurnitureCategory.BED) {
      switch (stepId) {
        case 'dimensions':
          return (
            <div className="space-y-12">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Ruler className="w-3 h-3 text-brand-gold" /> {t('Engineering Dimensions')} (mm)
              </h3>
              <div className="grid grid-cols-1 gap-8">
                {[
                  { label: t('Length Label'), key: 'length' },
                  { label: t('Width Label'), key: 'width' },
                  { label: t('Height Label'), key: 'height' }
                ].map((f) => {
                  const key = f.key as keyof GenericConfiguration;
                  return (
                    <div key={key} className="space-y-3">
                      <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em]">{f.label}</label>
                      <input
                        type="number"
                        value={genericConfig[key] as number}
                        onChange={e => updateGenericConfig({ [key]: Number(e.target.value) })}
                        className="w-full bg-transparent border-b border-brand-brown/10 text-2xl font-serif italic text-brand-brown focus:border-brand-gold outline-none pb-2 transition-colors"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-8">
                <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em] mb-3 block">{t('Top Thickness')} (mm)</label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(Thickness).map(th => (
                    <button
                      key={th}
                      onClick={() => updateGenericConfig({ thickness: th })}
                      className={`p-4 border rounded-xl text-[10px] font-bold ${genericConfig.thickness === th ? 'bg-brand-gold text-white' : 'bg-white text-brand-brown border-brand-beige'}`}
                    >
                      {t(th)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        case 'material':
          return (
            <div className="space-y-12">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layers className="w-3 h-3 text-brand-gold" /> {t('Material Specification')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(Material).map(m => (
                  <button
                    key={m}
                    onClick={() => updateGenericConfig({ material: m })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest transition-all ${genericConfig.material === m ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'finish':
          return (
             <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Surface Treatment')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(FinishType).map(f => (
                  <button
                    key={f}
                    onClick={() => updateGenericConfig({ finish: f })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${genericConfig.finish === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(f)}
                  </button>
                ))}
              </div>
            </div>
          );
        case 'addons':
           return (
            <div className="space-y-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <PlusCircle className="w-3 h-3 text-brand-gold" /> 附加配件 Add-ons
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.values(AddOn).map(a => (
                  <button
                    key={a}
                    onClick={() => toggleGenericAddOn(a)}
                    className={`p-8 text-left border rounded-[32px] flex justify-between items-center transition-all ${genericConfig.addOns.includes(a) ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl translate-x-3' : 'bg-white text-brand-brown border-brand-beige hover:border-brand-gold-muted hover:translate-x-1'}`}
                  >
                    <span className="text-xl font-serif italic">{t(a)}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono font-bold text-brand-brown uppercase tracking-tighter">+{ADDON_COSTS_BASE[a] || 150} AED</span>
                      {genericConfig.addOns.includes(a) && <X className="w-4 h-4 text-brand-gold opacity-50" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
           );
        case 'color':
          const currentConfig = selectedCategory === FurnitureCategory.BED ? config : (selectedCategory === FurnitureCategory.SOFA ? sofaConfig : genericConfig);
          const updateFn = selectedCategory === FurnitureCategory.BED ? updateConfig : (selectedCategory === FurnitureCategory.SOFA ? updateSofaConfig : updateGenericConfig);
          
          return (
            <div className="space-y-12">
              <section className="space-y-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                  <Palette className="w-3 h-3 text-brand-gold" /> {t('Color Way')}
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  {Object.values(Color).map(c => (
                    <button
                      key={c}
                      onClick={() => updateFn({ color: c })}
                      className={`h-16 rounded-3xl border-2 transition-all flex items-center justify-center relative group ${currentConfig.color === c ? 'border-brand-gold scale-110 shadow-lg' : 'border-transparent hover:border-brand-beige'}`}
                      style={{ backgroundColor: c === Color.WHITE ? '#FFFFFF' : c === Color.BEIGE ? '#F5F5DC' : c === Color.WALNUT ? '#5D4037' : c === Color.GREY ? '#808080' : '#CCCCCC' }}
                      title={t(c)}
                    >
                      {currentConfig.color === c && (
                        <div className="bg-brand-brown rounded-full p-1 shadow-md">
                          <PlusCircle className={`w-4 h-4 ${c === Color.WHITE || c === Color.BEIGE ? 'text-brand-gold' : 'text-brand-ivory'}`} />
                        </div>
                      )}
                      <span className="absolute -bottom-6 text-[8px] font-bold uppercase tracking-widest text-brand-brown opacity-0 group-hover:opacity-100 transition-opacity">{t(c)}</span>
                    </button>
                  ))}
                </div>

                {currentConfig.color === Color.CUSTOM && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 p-8 bg-white border border-brand-beige rounded-[32px] space-y-4"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block">
                      {t('Custom Color Specification')}
                    </label>
                    <input
                      type="text"
                      value={currentConfig.customColor || ''}
                      onChange={e => updateFn({ customColor: e.target.value })}
                      placeholder="e.g. RAL 9016 / Pantone 432C / light oak / dark grey matte"
                      className="w-full bg-brand-beige/10 border-b border-brand-beige py-4 px-2 font-serif italic text-xl text-brand-brown focus:border-brand-gold outline-none transition-colors"
                    />
                  </motion.div>
                )}
              </section>
            </div>
          );
        case 'frame':
          return (
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Square className="w-3 h-3 text-brand-gold" /> {t('Structure/Frame')}
              </h3>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: t('Wood Structure'), type: FrameType.SLATS, cost: 300 },
                  { label: t('Metal Structure'), type: FrameType.METAL, cost: 500 },
                  { label: t('Mixed Structure'), type: FrameType.STORAGE, cost: 700 }
                ].map(f => (
                  <button
                    key={f.type}
                    onClick={() => updateGenericConfig({ frameType: f.type })}
                    className={`p-10 text-left border rounded-[32px] transition-all relative group ${genericConfig.frameType === f.type ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl' : 'bg-brand-beige/30 text-brand-brown border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="block text-xl font-serif italic mb-2 tracking-tight">{f.label}</span>
                    <span className={`text-[10px] font-mono opacity-60 ${genericConfig.frameType === f.type ? 'text-brand-gold' : 'text-brand-brown'}`}>+{f.cost} AED</span>
                    {genericConfig.frameType === f.type && <div className="absolute top-0 right-0 p-4"><PlusCircle className="w-4 h-4 text-brand-gold" /></div>}
                  </button>
                ))}
              </div>
            </div>
          );
        default:
          return null;
      }
    }

    // Existing Bed render logic starting from dimensions
    switch (stepId) {
      case 'dimensions':
        return (
          <div className="space-y-12">
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Ruler className="w-3 h-3 text-brand-gold" /> {t('Select Foundation')}
              </h3>
              <div className="grid grid-cols-2 gap-5">
                {Object.values(BedSize).map(s => (
                  <button
                    key={s}
                    onClick={() => updateConfig({ size: s })}
                    className={`p-8 text-left border rounded-[32px] transition-all relative overflow-hidden group ${config.size === s ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl' : 'bg-brand-beige/30 text-brand-brown border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="block text-xl font-serif italic tracking-tight">{t(s)}</span>
                    {SIZE_DIMENSIONS[s] && <span className={`text-[10px] font-mono mt-1 block opacity-60 ${config.size === s ? 'text-brand-gold-muted' : 'text-brand-brown'}`}>{SIZE_DIMENSIONS[s].w} x {SIZE_DIMENSIONS[s].l} mm</span>}
                    {config.size === s && <div className="absolute top-0 right-0 p-3"><PlusCircle className="w-4 h-4 text-brand-gold" /></div>}
                  </button>
                ))}
              </div>
            </section>
            
            <section className="bg-brand-beige/20 p-10 rounded-[40px] border border-brand-beige">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown mb-8 italic">{t('Dimensions Adjustment')}</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 font-sans">
                {[
                  { label: t('Width Label'), key: 'width' },
                  { label: t('Length Label'), key: 'length' },
                  { label: t('Bed Height Label'), key: 'height' },
                  { label: t('Headboard Height Label'), key: 'headboardHeight' }
                ].map(f => (
                  <div key={f.key} className="space-y-3">
                    <label className="text-[9px] font-bold text-brand-brown-muted uppercase tracking-[0.15em]">{f.label}</label>
                    <input
                      type="number"
                      value={config[f.key as keyof BedConfiguration] as number}
                      onChange={e => updateConfig({ [f.key]: Number(e.target.value), size: (f.key === 'width' || f.key === 'length') ? BedSize.CUSTOM : config.size })}
                      className="w-full bg-transparent border-b border-brand-brown/10 text-xl font-serif italic text-brand-brown focus:border-brand-gold outline-none pb-2 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
      case 'material':
        return (
          <div className="space-y-12">
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Layers className="w-3 h-3 text-brand-gold" /> {t('Primary Substrate')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(Material).map(m => (
                  <button
                    key={m}
                    onClick={() => updateConfig({ material: m })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest transition-all ${config.material === m ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Settings className="w-3 h-3 text-brand-gold" /> {t('Board Thickness')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(Thickness).map(tVal => (
                  <button
                    key={tVal}
                    onClick={() => updateConfig({ thickness: tVal })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest transition-all ${config.thickness === tVal ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(tVal)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      case 'frame':
        return (
          <div className="space-y-12">
             <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Square className="w-3 h-3 text-brand-gold" /> {t('Core Structure')}
              </h3>
              <div className="space-y-4">
                {Object.values(FrameType).map(f => (
                  <button
                    key={f}
                    onClick={() => updateConfig({ frame: f })}
                    className={`w-full p-8 text-left border rounded-[28px] flex justify-between items-center group transition-all ${config.frame === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl' : 'bg-brand-beige/20 text-brand-brown border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    <span className="text-lg font-serif italic">{t(f)}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${config.frame === f ? 'text-brand-gold group-hover:text-brand-ivory' : 'text-brand-brown-muted opacity-80'}`}>+{FRAME_TYPE_COSTS[f]} AED</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Headboard Architecture')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(HeadboardType).map(h => (
                  <button
                    key={h}
                    onClick={() => updateConfig({ headboard: h })}
                    className={`p-5 text-xs text-center border rounded-[20px] font-bold uppercase tracking-widest ${config.headboard === h ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(h)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      case 'finish':
        return (
          <div className="space-y-12">
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> {t('Surface Treatment')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(FinishType).map(f => (
                  <button
                    key={f}
                    onClick={() => updateConfig({ finish: f })}
                    className={`p-6 text-center border rounded-[24px] font-bold text-xs uppercase tracking-widest ${config.finish === f ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-lg' : 'bg-white text-brand-brown/80 border-brand-beige hover:border-brand-gold-muted'}`}
                  >
                    {t(f)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      case 'addons':
        return (
          <div className="space-y-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
              <PlusCircle className="w-3 h-3 text-brand-gold" /> 豪华配置升级 Luxury Enhancements
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {Object.values(AddOn).map(a => (
                <button
                  key={a}
                  onClick={() => toggleAddOn(a)}
                  className={`p-8 text-left border rounded-[32px] flex justify-between items-center transition-all ${config.addOns.includes(a) ? 'bg-brand-brown text-brand-ivory border-brand-brown shadow-xl translate-x-3' : 'bg-white text-brand-brown border-brand-beige hover:border-brand-gold-muted hover:translate-x-1'}`}
                >
                  <span className="text-xl font-serif italic">{t(a)}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-mono font-bold text-brand-brown uppercase tracking-tighter">+{ADDON_COSTS_BASE[a]} AED</span>
                    {config.addOns.includes(a) && <X className="w-4 h-4 text-brand-gold opacity-50" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 'color':
        return (
          <div className="space-y-12">
            <section className="space-y-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-brown flex items-center gap-2">
                <Palette className="w-3 h-3 text-brand-gold" /> 颜色方案 Color Way
              </h3>
              <div className="grid grid-cols-5 gap-4">
                {Object.values(Color).map(c => (
                  <button
                    key={c}
                    onClick={() => updateConfig({ color: c })}
                    className={`h-16 rounded-3xl border-2 transition-all flex items-center justify-center relative group ${config.color === c ? 'border-brand-gold scale-110 shadow-lg' : 'border-transparent hover:border-brand-beige'}`}
                    style={{ backgroundColor: c === Color.WHITE ? '#FFFFFF' : c === Color.BEIGE ? '#F5F5DC' : c === Color.WALNUT ? '#5D4037' : c === Color.GREY ? '#808080' : '#CCCCCC' }}
                    title={t(c)}
                  >
                    {config.color === c && (
                      <div className="bg-brand-brown rounded-full p-1 shadow-md">
                        <PlusCircle className={`w-4 h-4 ${c === Color.WHITE || c === Color.BEIGE ? 'text-brand-gold' : 'text-brand-ivory'}`} />
                      </div>
                    )}
                    <span className="absolute -bottom-6 text-[8px] font-bold uppercase tracking-widest text-brand-brown opacity-0 group-hover:opacity-100 transition-opacity">{t(c)}</span>
                  </button>
                ))}
              </div>

              {config.color === Color.CUSTOM && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 p-8 bg-white border border-brand-beige rounded-[32px] space-y-4"
                >
                  <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block">
                    自定义颜色描述 Custom Color Specification (RAL / Pantone / Name)
                  </label>
                  <input
                    type="text"
                    value={config.customColor || ''}
                    onChange={e => updateConfig({ customColor: e.target.value })}
                    placeholder="e.g. RAL 9016 / Pantone 432C / light oak / dark grey matte"
                    className="w-full bg-brand-beige/10 border-b border-brand-beige py-4 px-2 font-serif italic text-xl text-brand-brown focus:border-brand-gold outline-none transition-colors"
                  />
                </motion.div>
              )}
            </section>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory text-brand-brown selection:bg-brand-gold/20 font-sans">
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{y:50}} animate={{y:0}} className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-hidden relative border border-brand-beige">
              <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 p-2 bg-brand-beige rounded-full hover:bg-brand-gold-muted/30 transition-colors text-brand-brown"><X className="w-5 h-5" /></button>
              <h2 className="text-3xl font-serif italic tracking-tight mb-8 flex items-center gap-3 text-brand-brown">
                <CreditCard className="w-7 h-7 text-brand-gold" /> {t('Pricing Configuration')}
              </h2>
              <div className="grid grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">{t('Material & Finish')}</h4>
                  {Object.values(Material).map(m => (
                    <div key={m} className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t(m)}</label>
                      <input type="number" value={prices[m]} onChange={e => setPrices({...prices, [m]: Number(e.target.value)})} className="w-full p-4 bg-brand-beige/50 rounded-2xl font-mono text-sm border-none outline-none focus:ring-1 focus:ring-brand-gold" />
                    </div>
                  ))}
                  <div className="space-y-1 pt-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">面料 Upholstery (m²)</label>
                    <input type="number" value={prices.upholsteryFabric} onChange={e => setPrices({...prices, upholsteryFabric: Number(e.target.value)})} className="w-full p-4 bg-brand-beige/50 rounded-2xl font-mono text-sm border-none outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">饰面 Finish (m²)</label>
                    <input type="number" value={prices.finishVeneer} onChange={e => setPrices({...prices, finishVeneer: Number(e.target.value)})} className="w-full p-4 bg-brand-beige/50 rounded-2xl font-mono text-sm border-none outline-none" />
                  </div>
                </section>
                <section className="space-y-4">
                   <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">其它费用项 Manual Overheads</h4>
                   {[
                     { key: 'labor', label: '人工费 Labor' },
                     { key: 'packaging', label: '包装费 Packaging' },
                     { key: 'transport', label: '运输费 Transport' },
                     { key: 'installation', label: '安装费 Installation' }
                   ].map(cost => (
                     <div key={cost.key} className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{cost.label}</label>
                        <input 
                          type="number" 
                          value={prices[cost.key as keyof MaterialPrices]} 
                          onChange={e => setPrices({...prices, [cost.key]: Number(e.target.value)})} 
                          className="w-full p-4 bg-brand-beige/50 rounded-2xl font-mono text-sm border-none outline-none" 
                        />
                     </div>
                   ))}
                   <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-brand-beige">
                     <div className="space-y-1">
                       <label className="text-[9px] font-bold uppercase tracking-wide text-brand-gold">利润 Margin %</label>
                       <input type="number" value={prices.marginPercent} onChange={e => setPrices({...prices, marginPercent: Number(e.target.value)})} className="w-full p-3 bg-brand-beige/50 rounded-xl font-mono text-xs border-none outline-none" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-bold uppercase tracking-wide text-brand-gold">税率 VAT %</label>
                       <input type="number" value={prices.vatPercent} onChange={e => setPrices({...prices, vatPercent: Number(e.target.value)})} className="w-full p-3 bg-brand-beige/50 rounded-xl font-mono text-xs border-none outline-none" />
                     </div>
                   </div>
                </section>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full mt-10 p-5 bg-brand-brown text-brand-ivory rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-brand-brown/90 transition-all shadow-lg shadow-brand-brown/10">保存并应用 Save & Apply Rates</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-6 lg:py-12">
        {_returnUrlParam && (
          <div className="mb-6 flex items-center justify-between px-5 py-2.5 bg-brand-brown rounded-2xl text-brand-ivory">
            <a
              href={_returnUrlParam}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:text-brand-ivory transition-colors group"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              返回 DEAL 项目
            </a>
            <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-widest text-brand-ivory/50">
              {_clientParam && <span>客户：<span className="text-brand-ivory">{_clientParam}</span></span>}
              {_projectParam && <span>项目：<span className="text-brand-ivory">{_projectParam}</span></span>}
              {_businessIdParam && <span className="text-brand-gold/80">{_businessIdParam}</span>}
              {_salespersonParam && <span>负责人：<span className="text-brand-ivory">{_salespersonParam}</span></span>}
            </div>
          </div>
        )}
        <header className="mb-10 flex justify-between items-center bg-gradient-to-r from-[#0C1B3A] via-[#0F2551] to-[#0C1B3A] text-white px-8 py-4 rounded-[28px] shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#C9A84C] to-[#A07C2D] w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <span className="text-white font-black text-sm tracking-tight">G</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight uppercase leading-none">GCI Quotation Center</h1>
                <span className="text-[9px] bg-[#C9A84C]/20 border border-[#C9A84C]/30 px-2 py-0.5 rounded text-[#E8C96A] font-bold tracking-wide">LIVING STUDIO</span>
              </div>
              <p className="text-[10px] text-white/50 font-medium mt-0.5">FF&amp;E · Engineering Quotation · BOQ</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView(view === 'history' ? 'configurator' : 'history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${view === 'history' ? 'bg-[#C9A84C] text-[#0C1B3A]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              {view === 'history' ? 'Back' : t('History')}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Pricing
            </button>
          </div>
        </header>

        <main className="bg-white rounded-[56px] shadow-[0_45px_120px_-30px_rgba(62,39,35,0.08)] border border-brand-beige overflow-hidden">
          <div className="p-8 sm:p-20 min-h-[650px] flex flex-col">
            {view === 'history' ? (
              <div className="space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-serif italic text-brand-brown">{t('Quotation History Title')}</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">Review and manage past quotations</p>
                </div>
                <div className="space-y-6">
                  {quoteHistory.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-brand-beige rounded-[40px] text-brand-brown-muted">
                        <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-serif italic text-lg">{t('No records found')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {quoteHistory.map(quote => (
                        <div key={quote.id} className="p-8 bg-brand-beige/20 border border-brand-beige rounded-[32px] flex flex-col sm:flex-row justify-between items-center gap-6 hover:shadow-lg transition-all group">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">{quote.date} | {quote.quoteNumber}</span>
                            <h3 className="text-xl font-serif italic text-brand-brown">{quote.customerProjectName || '未命名项目'}</h3>
                            <div className="flex items-center gap-2 mt-2">
                               <span className="px-2 py-0.5 bg-brand-brown text-brand-ivory text-[8px] font-bold uppercase rounded-full">{t(quote.category)}</span>
                               <span className="text-[10px] text-brand-brown-muted italic">By: {quote.salesperson || 'Staff'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                             <div className="text-right">
                               <span className="text-[10px] font-bold text-brand-brown-muted uppercase block">Total Amount</span>
                               <span className="text-2xl font-serif italic text-brand-brown">{quote.totalAmount.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-xs not-italic">AED</span></span>
                             </div>
                             <button 
                                onClick={() => restoreQuote(quote)}
                                className="p-4 bg-white border border-brand-beige rounded-full text-brand-gold hover:bg-brand-brown hover:text-brand-ivory transition-all"
                              >
                               <ChevronRight className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : !projectInfoSubmitted ? (
              renderProjectInfo()
            ) : !quoteType ? (
              <TypeSelection
                onSelect={handleTypeSelect}
                onBack={() => setProjectInfoSubmitted(false)}
                projectName={quoteInfo.customerProjectName}
              />
            ) : quoteMode === 'package' && !selectedCategory ? (
              renderPackageWorkspace()
            ) : !selectedCategory ? (
              renderCategorySelection()
            ) : (
              <>
                {/* Step Indicator — Step 3 = Category selected, Step 4 = final step (summary) */}
                <StepIndicator current={currentStep >= STEPS.length - 1 ? 4 : 3} />

                <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="p-3 bg-brand-beige/50 rounded-full hover:bg-brand-brown hover:text-brand-ivory transition-all text-brand-brown"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedScenario && (
                          <>
                            <span className="text-[8px] font-bold text-brand-gold uppercase tracking-widest">{t(selectedScenario)}</span>
                            <span className="w-1 h-1 rounded-full bg-brand-beige" />
                          </>
                        )}
                        <span className="text-[8px] font-bold text-brand-brown uppercase tracking-widest">{t(selectedCategory)}</span>
                      </div>
                      <h2 className="text-xl font-serif italic text-brand-brown mt-1">{t('Configuration Panel')}</h2>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {STEPS.map((step, idx) => (
                      <div 
                        key={step.id}
                        className={`w-2 h-2 rounded-full transition-all duration-500 ${idx === currentStep ? 'bg-brand-gold w-6' : idx < currentStep ? 'bg-brand-brown' : 'bg-brand-beige'}`}
                      />
                    ))}
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-grow"
                  >
                    <div className="max-w-2xl mx-auto">
                      {renderRequirementInfo()}
                      {renderStep()}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {currentStep < STEPS.length - 1 && (
                  <div className="mt-20 flex justify-between items-center max-w-2xl mx-auto w-full pt-12 border-t border-brand-beige">
                    <button
                      onClick={handleBack}
                      className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${currentStep === 0 ? 'opacity-0 cursor-default' : 'text-brand-gold-muted hover:text-brand-brown'}`}
                    >
                      <ChevronLeft className="w-4 h-4" /> {t('Previous')}
                    </button>
                    <button
                      onClick={handleNext}
                      className="bg-brand-brown text-brand-ivory py-6 px-14 rounded-[28px] text-[11px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-brand-brown/20 flex items-center gap-4 hover:translate-x-1 hover:shadow-brand-brown/30 transition-all active:scale-95 group"
                    >
                      {t('Next Stage')} <ChevronRight className="w-4 h-4 text-brand-gold group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="mt-20 flex flex-col sm:flex-row justify-between items-center gap-10 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-brown-muted italic px-4">
          <div className="flex gap-12">
             <span className="hover:text-brand-brown transition-colors cursor-default">{t('Terms Factory')}</span>
             <span className="hover:text-brand-brown transition-colors cursor-default">{t('Commercial Grade')}</span>
          </div>
          <div className="flex items-center gap-4">
             <span className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_12px_rgba(197,160,89,0.6)] animate-pulse" />
             <span className="text-brand-brown opacity-80">{t('Verified Status')}</span>
          </div>
        </footer>

        {/* Module Edit Modal */}
        <AnimatePresence>
          {isModuleModalOpen && editingModule && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModuleModalOpen(false)}
                className="absolute inset-0 bg-brand-brown/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative bg-brand-ivory w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[60px] shadow-3xl border border-brand-gold/20 p-8 sm:p-16 custom-scrollbar text-sans"
              >
                <button 
                  onClick={() => setIsModuleModalOpen(false)}
                  className="absolute top-8 right-8 p-4 rounded-full bg-brand-beige/20 text-brand-brown hover:bg-brand-brown hover:text-brand-ivory transition-all z-20"
                >
                  <X className="w-6 h-6" />
                </button>
      
                <div className="space-y-12">
                  <header className="space-y-3">
                     <span className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.4em]">Module Configuration</span>
                     <h2 className="text-4xl font-serif italic text-brand-brown">{t('Detailed Parameters')}</h2>
                  </header>
      
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Module Type')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.values(CabinetModuleType).map(type => (
                          <button
                            key={type}
                            onClick={() => setEditingModule({...editingModule, type})}
                            className={`p-4 text-[10px] font-bold uppercase tracking-wider rounded-2xl border transition-all ${editingModule.type === type ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white text-brand-brown border-brand-beige hover:border-brand-gold'}`}
                          >
                            {t(type)}
                          </button>
                        ))}
                      </div>
                    </div>
      
                    <div className="space-y-6">
                      <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Dimensions & Qty')}</label>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { label: t('Width Label'), key: 'width' },
                          { label: t('Depth Label'), key: 'depth' },
                          { label: t('Height Label'), key: 'height' },
                          { label: 'Quantity 数量', key: 'quantity' }
                        ].map(field => (
                          <div key={field.key} className="space-y-2">
                             <span className="text-[9px] font-bold text-brand-gold/60 uppercase">{field.label}</span>
                             <input 
                               type="number"
                               value={(editingModule as any)[field.key]}
                               onChange={e => setEditingModule({...editingModule, [field.key]: Number(e.target.value)})}
                               className="w-full bg-transparent border-b border-brand-brown/10 py-2 text-xl font-serif italic focus:border-brand-gold outline-none"
                             />
                          </div>
                        ))}
                      </div>
                    </div>
      
                    <div className="space-y-6">
                       <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Materials')}</label>
                       <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-3">
                           {[Material.PLYWOOD, Material.MDF, Material.SOLID_WOOD].map(m => (
                             <button
                               key={m}
                               onClick={() => setEditingModule({...editingModule, material: m})}
                               className={`p-4 text-[10px] font-bold rounded-2xl border ${editingModule.material === m ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white border-brand-beige'}`}
                             >
                               {t(m)}
                             </button>
                           ))}
                         </div>
                         <div className="grid grid-cols-4 gap-2">
                           {Object.values(Thickness).map(th => (
                             <button
                               key={th}
                               onClick={() => setEditingModule({...editingModule, thickness: th})}
                               className={`p-3 text-[9px] font-bold rounded-xl border ${editingModule.thickness === th ? 'bg-brand-gold text-white border-brand-gold' : 'bg-white border-brand-beige'}`}
                             >
                               {t(th)}
                             </button>
                           ))}
                         </div>
                       </div>
                    </div>
      
                    <div className="space-y-6">
                      <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Aesthetics')}</label>
                      <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-3">
                            {Object.values(FinishType).map(f => (
                              <button
                                key={f}
                                onClick={() => setEditingModule({...editingModule, finish: f})}
                                className={`p-4 text-[10px] font-bold rounded-2xl border ${editingModule.finish === f ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white border-brand-beige'}`}
                              >
                                {t(f)}
                              </button>
                            ))}
                         </div>
                         <div className="grid grid-cols-5 gap-2">
                            {Object.values(Color).map(c => (
                              <button
                                key={c}
                                onClick={() => setEditingModule({...editingModule, color: c})}
                                className={`h-10 rounded-xl border-2 transition-all flex items-center justify-center ${editingModule.color === c ? 'border-brand-gold scale-105 shadow-sm' : 'border-transparent'}`}
                                style={{ backgroundColor: c === Color.WHITE ? '#FFFFFF' : c === Color.BEIGE ? '#F5F5DC' : c === Color.WALNUT ? '#5D4037' : c === Color.GREY ? '#808080' : '#CCCCCC' }}
                              >
                                {editingModule.color === c && <PlusCircle className={`w-3 h-3 ${c === Color.WHITE || c === Color.BEIGE ? 'text-brand-gold' : 'text-brand-ivory'}`} />}
                              </button>
                            ))}
                         </div>
                      </div>
                    </div>
  
                    <div className="space-y-6">
                      <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Options')}</label>
                      <div className="space-y-6 text-[10px]">
                         <div className="flex items-center justify-between p-5 bg-brand-beige/20 rounded-3xl">
                            <span className="font-bold uppercase tracking-widest">{t('Door Type Label')}</span>
                            <select 
                              value={editingModule.doorType}
                              onChange={e => setEditingModule({...editingModule, doorType: e.target.value as DoorType})}
                              className="bg-transparent border-none outline-none font-serif italic text-brand-brown text-right"
                            >
                              {Object.values(DoorType).map(dt => <option key={dt} value={dt}>{t(dt)}</option>)}
                            </select>
                         </div>
                         {editingModule.doorType !== DoorType.OPEN && (
                            <div className="flex items-center justify-between p-5 bg-brand-beige/20 rounded-3xl">
                               <span className="font-bold uppercase tracking-widest">{t('Door Count Label')}</span>
                               <input 
                                 type="number"
                                 value={editingModule.doorCount}
                                 onChange={e => setEditingModule({...editingModule, doorCount: Number(e.target.value)})}
                                 className="w-12 bg-transparent border-b border-brand-brown/10 text-center font-mono"
                               />
                            </div>
                         )}
                         <div className="flex items-center justify-between p-5 bg-brand-beige/20 rounded-3xl">
                            <span className="font-bold uppercase tracking-widest">{t('Mounting Label')}</span>
                            <select 
                              value={editingModule.mounting}
                              onChange={e => setEditingModule({...editingModule, mounting: e.target.value as MountingType})}
                              className="bg-transparent border-none outline-none font-serif italic text-brand-brown text-right"
                            >
                              {Object.values(MountingType).map(mt => <option key={mt} value={mt}>{t(mt)}</option>)}
                            </select>
                         </div>
                         <div className="flex items-center justify-between p-5 bg-brand-beige/20 rounded-3xl">
                            <span className="font-bold uppercase tracking-widest">{t('Drawers Label')}</span>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setEditingModule({...editingModule, hasDrawers: !editingModule.hasDrawers})}
                                className={`w-12 h-6 rounded-full relative transition-colors ${editingModule.hasDrawers ? 'bg-brand-gold' : 'bg-brand-beige'}`}
                              >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingModule.hasDrawers ? 'left-7' : 'left-1'}`} />
                              </button>
                              {editingModule.hasDrawers && (
                                <input 
                                  type="number"
                                  value={editingModule.drawerCount}
                                  onChange={e => setEditingModule({...editingModule, drawerCount: Number(e.target.value)})}
                                  className="w-12 bg-transparent border-b border-brand-brown/10 text-center font-mono"
                                />
                              )}
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Internal Layout')}</label>
                      <div className="space-y-4 text-[10px]">
                         <div className="flex items-center justify-between p-5 bg-brand-beige/20 rounded-3xl">
                            <span className="font-bold uppercase tracking-widest">{t('Shelves Label')}</span>
                            <input 
                              type="number"
                              value={editingModule.shelfCount}
                              onChange={e => setEditingModule({...editingModule, shelfCount: Number(e.target.value)})}
                              className="w-12 bg-transparent border-b border-brand-brown/10 text-center font-mono"
                            />
                         </div>
                         <div className="flex items-center justify-between p-5 bg-brand-beige/20 rounded-3xl">
                            <span className="font-bold uppercase tracking-widest">{t('Hanging Rail Label')}</span>
                            <button 
                              onClick={() => setEditingModule({...editingModule, hasHangingRail: !editingModule.hasHangingRail})}
                              className={`w-12 h-6 rounded-full relative transition-colors ${editingModule.hasHangingRail ? 'bg-brand-gold' : 'bg-brand-beige'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingModule.hasHangingRail ? 'left-7' : 'left-1'}`} />
                            </button>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-6 md:col-span-2">
                       <label className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-widest">{t('Hardware Configuration')}</label>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <div className="space-y-3">
                            <span className="text-[9px] font-bold text-brand-gold/60 uppercase block">{t('Hinge Label')}</span>
                            <div className="flex flex-col gap-2">
                               {Object.values(HingeType).map(h => (
                                 <button
                                   key={h}
                                   onClick={() => setEditingModule({...editingModule, hingeType: h})}
                                   className={`px-4 py-3 text-[10px] font-bold rounded-xl border text-left transition-all ${editingModule.hingeType === h ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white border-brand-beige'}`}
                                 >
                                   {t(h)}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-3">
                            <span className="text-[9px] font-bold text-brand-gold/60 uppercase block">{t('Runner Label')}</span>
                            <div className="flex flex-col gap-2">
                               {Object.values(RunnerType).map(r => (
                                 <button
                                   key={r}
                                   onClick={() => setEditingModule({...editingModule, runnerType: r})}
                                   className={`px-4 py-3 text-[10px] font-bold rounded-xl border text-left transition-all ${editingModule.runnerType === r ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white border-brand-beige'}`}
                                 >
                                   {t(r)}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-3">
                            <span className="text-[9px] font-bold text-brand-gold/60 uppercase block">{t('Handle Label')}</span>
                            <div className="flex flex-col gap-2">
                               {Object.values(HandleType).map(h => (
                                 <button
                                   key={h}
                                   onClick={() => setEditingModule({...editingModule, handle: h})}
                                   className={`px-4 py-3 text-[10px] font-bold rounded-xl border text-left transition-all ${editingModule.handle === h ? 'bg-brand-brown text-brand-ivory border-brand-brown' : 'bg-white border-brand-beige'}`}
                                 >
                                   {t(h)}
                                 </button>
                               ))}
                            </div>
                         </div>
                       </div>
                    </div>
                  </div>
      
                  <div className="pt-12 border-t border-brand-beige flex justify-end gap-6">
                     <button 
                       onClick={() => setIsModuleModalOpen(false)}
                       className="px-10 py-5 rounded-full text-[11px] font-bold uppercase tracking-widest text-brand-brown-muted hover:text-brand-brown"
                     >
                       {t('Cancel')}
                     </button>
                     <button 
                       onClick={handleSaveModule}
                       className="px-12 py-5 rounded-full bg-brand-brown text-brand-ivory text-[11px] font-bold uppercase tracking-widest shadow-2xl shadow-brand-brown/30 hover:bg-brand-brown/90 transition-all"
                     >
                       {t('Save Module')}
                     </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
