import React, { useState } from 'react';

export const TaskContext = React.createContext();

export const TaskProvider = ({children}) => {
    const [tasks, setTasks] = useState([]);

    return(
        <TaskContext.Provider value={[tasks, setTasks]}>
            {children}
        </TaskContext.Provider>
    )
}