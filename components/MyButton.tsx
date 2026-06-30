import React from "react";

interface ButtonProps {
    label: string;
    onclick: () => void;
}

export const MyButton: React.FC<ButtonProps> = ({ label, onclick }) => {
    return (
        <button onClick={onclick}> {label}</button>
    );
};