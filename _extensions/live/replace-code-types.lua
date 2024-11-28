-- Creo que aquí hay un problema que evita que los argumentos funcionen. 
-- Quizás la clase no se debe colocar al final sino justo donde estaba la anterior.

function remove_class_by_value(classes, value)
    for i, class in ipairs(classes) do
      if class == value then
        table.remove(classes, i)
        break
      end
    end
  end
  
  function CodeBlock(el)
    -- Replace {r} with {webr}
    if el.classes:includes('r') then
      remove_class_by_value(el.classes, 'r')
      el.classes:insert('webr')
    end
  
    -- Replace {Python} with {pyodide}
    if el.classes:includes('python') then
      remove_class_by_value(el.classes, 'python')
      el.classes:insert('pyodide')
    end
  
    return el
  end
  