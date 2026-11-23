import { DEFAULT_VALUES } from '../../engine/interpolate'
import type { Layer, LayerType } from '../../engine/types'
import { layerBoxStyle, layerContentStyle } from './layerStyle'

function makeLayer(type: LayerType): Layer {
  return {
    id: 'a',
    name: 'Layer',
    type,
    base: { x: 10, y: 20, width: 30, height: 40 },
    style: { color: '#ff0000', text: 'Hello', fontSize: 32, src: '', radius: 20 },
    keyframes: [],
  }
}

describe('layerBoxStyle', () => {
  it('places the layer from its base in percent and applies neutral transforms', () => {
    expect(layerBoxStyle(makeLayer('rect'), DEFAULT_VALUES)).toEqual({
      position: 'absolute',
      left: '10%',
      top: '20%',
      width: '30%',
      height: '40%',
      translate: '0% 0%',
      rotate: '0deg',
      scale: 1,
      opacity: 1,
      filter: undefined,
    })
  })

  it('applies the animated values', () => {
    const style = layerBoxStyle(makeLayer('rect'), {
      translateX: 50,
      translateY: -25,
      rotate: 90,
      scale: 1.5,
      opacity: 0.5,
      blur: 4,
    })
    expect(style.translate).toBe('50% -25%')
    expect(style.rotate).toBe('90deg')
    expect(style.scale).toBe(1.5)
    expect(style.opacity).toBe(0.5)
    expect(style.filter).toBe('blur(4px)')
  })
})

describe('layerContentStyle', () => {
  it('rect: fills with the colour and scales the radius (20 of 1000 units = 2cqw)', () => {
    expect(layerContentStyle(makeLayer('rect'))).toEqual({
      background: '#ff0000',
      borderRadius: '2cqw',
    })
  })

  it('text: uses the colour and scales the font size (32 of 1000 units = 3.2cqw)', () => {
    expect(layerContentStyle(makeLayer('text'))).toEqual({ color: '#ff0000', fontSize: '3.2cqw' })
  })

  it('image: only rounds the corners', () => {
    expect(layerContentStyle(makeLayer('image'))).toEqual({ borderRadius: '2cqw' })
  })
})
