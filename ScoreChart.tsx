import React from 'react';
import type { Player } from './types';

interface ScoreChartProps {
  player: Player;
  onClose: () => void;
}

export const ScoreChart: React.FC<ScoreChartProps> = ({ player, onClose }) => {
    const scores = player.scoreHistory && player.scoreHistory.length > 0 ? player.scoreHistory : [0];

    const svgWidth = 500;
    const svgHeight = 300;
    const margin = { top: 20, right: 20, bottom: 35, left: 40 };
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    // Establish the Y-axis range, always including zero for context.
    let yMin = Math.min(0, ...scores);
    let yMax = Math.max(0, ...scores);

    // If there's no range (e.g., all scores are 0), create a default view.
    if (yMin === yMax) {
        yMin -= 5;
        yMax += 10;
    } else {
        // Add 10% padding to the top and bottom for better visual spacing.
        const padding = (yMax - yMin) * 0.1;
        yMin -= padding;
        yMax += padding;
    }

    const yRange = yMax - yMin;

    const scoreToY = (score: number) => {
        if (yRange === 0) {
            return chartHeight / 2; // Fallback for a flat line
        }
        // Map score from [yMin, yMax] to [chartHeight, 0] (SVG y-axis is top-to-bottom)
        return chartHeight - ((score - yMin) / yRange) * chartHeight;
    };
    
    const turnToX = (turnIndex: number) => {
        if (scores.length <= 1) {
            return 0;
        }
        return (turnIndex / (scores.length - 1)) * chartWidth;
    };
    
    const canDrawLine = scores.length > 1;

    const linePath = canDrawLine ? scores
        .map((score, index) => `${turnToX(index)},${scoreToY(score)}`)
        .join(' ') : '';

    return (
        <div className="chart-overlay" onClick={onClose}>
            <div className="chart-container" onClick={(e) => e.stopPropagation()}>
                <div className="chart-header">
                    <h3>روند امتیاز {player.name}</h3>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="score-chart-svg" aria-label={`نمودار امتیاز برای ${player.name}`}>
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        {/* Y-axis */}
                        <line x1="0" y1="0" x2="0" y2={chartHeight} className="chart-axis" />
                        <text x="-10" y={scoreToY(yMax)} dy=".32em" className="chart-label">{Math.ceil(yMax)}</text>
                        <text x="-10" y={scoreToY(yMin)} dy=".32em" className="chart-label">{Math.floor(yMin)}</text>
                        <text transform="rotate(-90)" y="-30" x={-chartHeight / 2} dy="1em" className="chart-axis-title">امتیاز</text>

                        {/* Zero-line for reference if it's in view */}
                        {yMin < 0 && yMax > 0 && (
                            <line 
                                x1="0" y1={scoreToY(0)} 
                                x2={chartWidth} y2={scoreToY(0)} 
                                style={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }} 
                            />
                        )}
                        
                        {/* X-axis */}
                        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} className="chart-axis" />
                        {scores.map((_, index) => (
                           index % Math.ceil(scores.length / 10) === 0 && (
                             <text key={index} x={turnToX(index)} y={chartHeight + 15} className="chart-label">{index}</text>
                           )
                        ))}
                        <text x={chartWidth / 2} y={chartHeight + 30} className="chart-axis-title">نوبت</text>

                        {/* Data Line */}
                        {canDrawLine && <polyline points={linePath} className="chart-line" />}

                        {/* Data Points */}
                        {scores.map((score, index) => (
                            <circle
                                key={index}
                                cx={turnToX(index)}
                                cy={scoreToY(score)}
                                r="4"
                                className="chart-dot"
                            >
                               <title>نوبت {index}: {score} امتیاز</title>
                            </circle>
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
};