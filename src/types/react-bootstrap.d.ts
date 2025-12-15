declare module 'react-bootstrap' {
  import * as React from 'react';

  export interface CarouselProps {
    activeIndex?: number;
    onSelect?: (selectedIndex: number, event?: any) => void;
    controls?: boolean;
    indicators?: boolean;
    interval?: number | null;
    touch?: boolean;
    className?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface CarouselItemProps {
    className?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export const Carousel: React.FC<CarouselProps> & {
    Item: React.FC<CarouselItemProps>;
  };
}

