import { useState, useEffect } from 'react'

const TypingEffect = ({ text, speed = 30 }) => {
    const [displayedText, setDisplayedText] = useState('')

    useEffect(() => {
        let index = 0
        setDisplayedText('')

        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(prev => prev + text[index])
                index++
            } else {
                clearInterval(timer)
            }
        }, speed)

        return () => clearInterval(timer)
    }, [text, speed])

    return <span>{displayedText}</span>
}

export default TypingEffect