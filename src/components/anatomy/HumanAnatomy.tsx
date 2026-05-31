import React from 'react';
import MaleHumanAnatomy from '@/components/anatomy/MaleHumanAnatomy';
import FemaleHumanAnatomy from '@/components/anatomy/FemaleHumanAnatomy';

export type MuscleGroup =
  | 'chest'
  | 'lats'
  | 'traps'
  | 'rotatorCuffs'
  | 'lowerBack'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'abductors'
  | 'calves'
  | 'neck'
  | 'shins';

export interface HumanMuscleAnatomyProps {
  gender?: 'male' | 'female';

  defaultMuscleColor?: string;
  backgroundColor?: string;

  primaryHighlightColor?: string;
  secondaryHighlightColor?: string;

  primaryOpacity?: number;
  secondaryOpacity?: number;

  selectedPrimaryMuscleGroups?: MuscleGroup[];
  selectedSecondaryMuscleGroups?: MuscleGroup[];

  className?: string;
  style?: React.CSSProperties;
}

export const HumanAnatomy: React.FC<HumanMuscleAnatomyProps> = (props) => {
  return props.gender === 'female' ? (
    <FemaleHumanAnatomy {...props} />
  ) : (
    <MaleHumanAnatomy {...props} />
  );
};

export default HumanAnatomy;
