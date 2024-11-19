import consola from 'consola';
import { kebabCase } from 'lodash-es';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pMap from 'p-map';
import { ComponentType, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';

import * as Icons from '../../src/icons';

const rootDir = resolve(__dirname, '../..');
const outputDir = resolve(rootDir, 'packages/static-svg/icons');
const outputPngDir = resolve(rootDir, 'packages/static-png');
const outputWebpDir = resolve(rootDir, 'packages/static-webp');

type ThemeMode = 'light' | 'dark';

const themeColors = {
  // 浅色主题使用黑色
  dark: '#FFFFFF',
  light: '#000000', // 深色主题使用白色
};

class SvgWorkflow {
  exportSvg(Component: ComponentType, outputFileName: string): void {
    const svgString = renderToStaticMarkup(createElement(Component));
    const svgContent = svgString.match(/<svg[^>]*>[\S\s]*<\/svg>/i)?.[0];

    if (!svgContent) {
      throw new Error('No SVG content found in the rendered component');
    }

    const filename = resolve(outputDir, kebabCase(outputFileName) + '.svg');
    writeFileSync(filename, svgContent, 'utf8');
    consola.success(`Exported SVG to ${filename}`);
  }

  async convertSvgToPng(
    svgPath: string,
    outputPath: string,
    height: number,
    themeMode: ThemeMode,
  ): Promise<void> {
    try {
      let svgContent = readFileSync(svgPath, 'utf8');
      const color = themeColors[themeMode];
      svgContent = svgContent.replaceAll('currentColor', color);

      await sharp(Buffer.from(svgContent)).resize({ height }).png().toFile(outputPath);
      consola.success(`PNG file has been saved to ${outputPath}`);
    } catch (error) {
      consola.error('Error converting SVG to PNG:', error);
    }
  }

  async convertSvgToWebp(
    svgPath: string,
    outputPath: string,
    height: number,
    themeMode: ThemeMode,
  ): Promise<void> {
    try {
      let svgContent = readFileSync(svgPath, 'utf8');
      const color = themeColors[themeMode];
      svgContent = svgContent.replaceAll('currentColor', color);

      await sharp(Buffer.from(svgContent)).resize({ height }).webp().toFile(outputPath);
      consola.success(`WebP file has been saved to ${outputPath}`);
    } catch (error) {
      consola.error('Error converting SVG to WebP:', error);
    }
  }

  async runSvg() {
    const data = Object.values(Icons).filter((icon: any) => icon?.colorPrimary);

    await pMap(data, async (Icon: any) => {
      try {
        this.exportSvg(Icon, `${Icon.title}`);
        if (Icon?.Color) {
          this.exportSvg(Icon.Color, `${Icon.title}-color`);
        }
        if (Icon?.Text) {
          this.exportSvg(Icon.Text, `${Icon.title}-text`);
        }
        if (Icon?.TextCn) {
          this.exportSvg(Icon.TextCn, `${Icon.title}-text-cn`);
        }
        if (Icon?.Brand) {
          this.exportSvg(Icon.Brand, `${Icon.title}-brand`);
        }
        if (Icon?.BrandColor) {
          this.exportSvg(Icon.BrandColor, `${Icon.title}-brand-color`);
        }
      } catch {
        consola.error(`Failed to export ${Icon.title}`);
      }
    });
  }

  async runPng() {
    await pMap(
      readdirSync(outputDir),
      async (file) => {
        if (file.endsWith('.svg')) {
          const svgPath = resolve(outputDir, file);
          const pngLightPath = resolve(outputPngDir, 'light', file.replace('.svg', '.png'));
          const pngDarkPath = resolve(outputPngDir, 'dark', file.replace('.svg', '.png'));
          await this.convertSvgToPng(svgPath, pngLightPath, 1024, 'light');
          await this.convertSvgToPng(svgPath, pngDarkPath, 1024, 'dark');
        }
      },
      { concurrency: 5 },
    );
  }

  async runWebp() {
    await pMap(
      readdirSync(outputDir),
      async (file) => {
        if (file.endsWith('.svg')) {
          const svgPath = resolve(outputDir, file);
          const webpLightPath = resolve(outputWebpDir, 'light', file.replace('.svg', '.webp'));
          const webpDarkPath = resolve(outputWebpDir, 'dark', file.replace('.svg', '.webp'));
          await this.convertSvgToPng(svgPath, webpLightPath, 1024, 'light');
          await this.convertSvgToPng(svgPath, webpDarkPath, 1024, 'dark');
        }
      },
      { concurrency: 5 },
    );
  }

  async run() {
    await this.runSvg();
    await this.runPng();
    await this.runWebp();
  }
}

const workflow = new SvgWorkflow();

workflow.run();
