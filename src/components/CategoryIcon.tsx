import React from 'react';
import {
  ForkKnife, Car, House, FirstAid, GameController, ShoppingBag,
  GraduationCap, AirplaneTilt, Lightbulb, Wrench, Barbell, PawPrint,
  Gift, Briefcase, Question, ShoppingCart, Coffee, Phone, Globe,
  Receipt, Shield, DeviceMobile, User, Notebook, Buildings,
  ChartLineUp, Rocket, Star, ArrowsClockwise, Bank, Package,
  TShirt, Heart,
} from 'phosphor-react-native';

// Maps category names (lowercase) to Phosphor icon components
const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  // ── Expense categories ──
  'food & dining': ForkKnife,
  'transport': Car,
  'housing & rent': House,
  'health & medical': FirstAid,
  'entertainment': GameController,
  'shopping & clothing': ShoppingBag,
  'education': GraduationCap,
  'travel': AirplaneTilt,
  'utilities': Lightbulb,
  'home maintenance': Wrench,
  'fitness': Barbell,
  'pets': PawPrint,
  'gifts & donations': Gift,
  'business': Briefcase,
  'other': Question,

  // Aliases for flexible matching
  groceries: ShoppingCart,
  food: ForkKnife,
  dining: ForkKnife,
  restaurants: ForkKnife,
  rent: House,
  housing: House,
  transportation: Car,
  health: FirstAid,
  healthcare: FirstAid,
  medical: FirstAid,
  shopping: ShoppingBag,
  clothing: TShirt,
  gym: Barbell,
  insurance: Shield,
  subscriptions: DeviceMobile,
  gifts: Gift,
  donations: Heart,
  personal: User,
  bills: Receipt,
  internet: Globe,
  phone: Phone,
  coffee: Coffee,
  maintenance: Wrench,

  // ── Income categories ──
  'salary / wages': Briefcase,
  'freelance / contract': Notebook,
  'business revenue': Buildings,
  'investments / dividends': ChartLineUp,
  'rental income': House,
  'side hustle': Rocket,
  'gift / allowance': Gift,
  'other income': Question,

  // Aliases for income categories
  salary: Briefcase,
  wages: Briefcase,
  freelance: Notebook,
  contract: Notebook,
  revenue: Buildings,
  investments: ChartLineUp,
  dividends: ChartLineUp,
  rental: House,
  hustle: Rocket,
  allowance: Gift,
  bonus: Star,
  refund: ArrowsClockwise,
  interest: Bank,
};

/**
 * Resolves the Phosphor icon component for a given category name.
 * Falls back to Package icon if no match is found.
 */
export function getCategoryIconComponent(categoryName: string | null | undefined): React.ComponentType<any> {
  if (!categoryName) return Package;
  const key = categoryName.toLowerCase().trim();

  // Direct match
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];

  // Partial match
  for (const [mapKey, component] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return component;
    }
  }

  return Package;
}

interface CategoryIconProps {
  categoryName: string | null | undefined;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  style?: any;
}

/**
 * Renders a Phosphor icon for the given category name.
 */
export default function CategoryIcon({
  categoryName,
  size = 20,
  color = '#ffffff',
  weight = 'bold',
  style,
}: CategoryIconProps) {
  const IconComponent = getCategoryIconComponent(categoryName);
  return <IconComponent size={size} color={color} weight={weight} style={style} />;
}
