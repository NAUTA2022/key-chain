'use client';

import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react';
import './StarBorder.css';

type StarBorderOwnProps<T extends ElementType> = {
  as?: T;
  className?: string;
  color?: string;
  speed?: CSSProperties['animationDuration'];
  thickness?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

export type StarBorderProps<T extends ElementType = 'button'> = StarBorderOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof StarBorderOwnProps<T>>;

type StarBorderRootProps = { className?: string; style?: CSSProperties; children?: ReactNode };

const StarBorder = <T extends ElementType = 'button'>({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  backgroundColor = '#000000',
  textColor = '#ffffff',
  borderColor = '#222222',
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = (as ?? 'button') as ElementType<StarBorderRootProps>;

  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        padding: `${thickness}px 0`,
        ...rest.style
      }}
      {...rest}
    >
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div className="inner-content" style={{ background: backgroundColor, color: textColor, borderColor }}>
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
