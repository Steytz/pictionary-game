import type { WordOption, Difficulty } from '../shared/types'

const EASY_WORDS = [
    'cat', 'dog', 'sun', 'moon', 'tree', 'house', 'car', 'book', 'phone', 'chair',
    'table', 'door', 'window', 'flower', 'bird', 'fish', 'star', 'cloud', 'rain', 'snow',
    'fire', 'water', 'grass', 'mountain', 'river', 'ocean', 'beach', 'island', 'bridge', 'road',
    'apple', 'banana', 'pizza', 'cake', 'cookie', 'milk', 'bread', 'cheese', 'egg', 'coffee',
    'hat', 'shoe', 'shirt', 'pants', 'dress', 'jacket', 'glasses', 'watch', 'ring', 'bag',
    'ball', 'bike', 'plane', 'train', 'boat', 'bus', 'truck', 'helicopter', 'rocket', 'robot'
]

const MEDIUM_WORDS = [
    'elephant', 'giraffe', 'butterfly', 'tornado', 'volcano', 'earthquake', 'dinosaur', 'pyramid',
    'castle', 'knight', 'dragon', 'wizard', 'vampire', 'zombie', 'superhero', 'villain',
    'telescope', 'microscope', 'computer', 'keyboard', 'headphones', 'camera', 'television', 'radio',
    'guitar', 'piano', 'drums', 'violin', 'trumpet', 'saxophone', 'orchestra', 'concert',
    'hospital', 'doctor', 'nurse', 'patient', 'ambulance', 'medicine', 'surgery', 'bandage',
    'teacher', 'student', 'classroom', 'homework', 'examination', 'graduation', 'library', 'university',
    'restaurant', 'waiter', 'chef', 'menu', 'kitchen', 'recipe', 'ingredient', 'dessert',
    'airport', 'passport', 'luggage', 'tourist', 'vacation', 'hotel', 'adventure', 'journey'
]

const HARD_WORDS = [
    'artificial intelligence', 'global warming', 'social media', 'virtual reality', 'time machine',
    'black hole', 'solar system', 'northern lights', 'great wall of china', 'statue of liberty',
    'mount everest', 'bermuda triangle', 'atlantis', 'stonehenge', 'easter island',
    'beethoven', 'shakespeare', 'mona lisa', 'van gogh', 'einstein', 'newton', 'darwin',
    'photosynthesis', 'evolution', 'gravity', 'democracy', 'capitalism', 'revolution', 'constitution',
    'meditation', 'yoga', 'mindfulness', 'philosophy', 'psychology', 'sociology', 'anthropology',
    'cryptocurrency', 'blockchain', 'quantum computing', 'genetic engineering', 'nanotechnology',
    'renewable energy', 'climate change', 'deforestation', 'endangered species', 'pollution',
    'archaeology', 'hieroglyphics', 'renaissance', 'industrial revolution', 'world war', 'cold war',
    'stock market', 'inflation', 'recession', 'entrepreneurship', 'innovation', 'sustainability'
]

const POINTS_CONFIG = {
    easy: { guesser: 1, drawer: 1 },
    medium: { guesser: 2, drawer: 1 },
    hard: { guesser: 3, drawer: 2 }
}

export function getWordOptions(): WordOption[] {
    const options: WordOption[] = []

    const easyWord = EASY_WORDS[Math.floor(Math.random() * EASY_WORDS.length)]
    const mediumWord = MEDIUM_WORDS[Math.floor(Math.random() * MEDIUM_WORDS.length)]
    const hardWord = HARD_WORDS[Math.floor(Math.random() * HARD_WORDS.length)]

    options.push({
        word: easyWord,
        difficulty: 'easy',
        points: POINTS_CONFIG.easy.guesser
    })

    options.push({
        word: mediumWord,
        difficulty: 'medium',
        points: POINTS_CONFIG.medium.guesser
    })

    options.push({
        word: hardWord,
        difficulty: 'hard',
        points: POINTS_CONFIG.hard.guesser
    })

    return options
}

export function getPoints(difficulty: Difficulty, isDrawer: boolean): number {
    const config = POINTS_CONFIG[difficulty]
    return isDrawer ? config.drawer : config.guesser
}

export function checkGuess(guess: string, word: string): 'correct' | 'close' | 'wrong' {
    const normalizedGuess = guess.toLowerCase().trim()
    const normalizedWord = word.toLowerCase().trim()

    if (normalizedGuess === normalizedWord) {
        return 'correct'
    }

    const distance = levenshteinDistance(normalizedGuess, normalizedWord)
    if (distance <= 2) {
        return 'close'
    }

    if (normalizedGuess.includes(normalizedWord) || normalizedWord.includes(normalizedGuess)) {
        if (Math.abs(normalizedGuess.length - normalizedWord.length) <= 3) {
            return 'close'
        }
    }

    return 'wrong'
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }

    return matrix[str2.length][str1.length]
}