import type { ComponentProps } from 'astro/types';

interface ScriptIslandProps {
  children?: any;
  once?: boolean;
}

declare const ScriptIsland: (props: ScriptIslandProps) => null;
export default ScriptIsland;
